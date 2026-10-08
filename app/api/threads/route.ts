import { db, ensureSchema } from "@/lib/db";
import { badRequest, requireProfileId, unauthorized } from "@/lib/api-auth";
import { THREAD_CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(req: Request) {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    const issue = new URL(req.url).searchParams.get("issue");
    const issueId = issue && UUID_RE.test(issue) ? issue : null;
    await ensureSchema();
    const sql = db();
    // SQL port of the clone's list_threads() RPC.
    const rows = await sql.query(
        `SELECT t.id, t.title, t.body, t.category, t.issue_id, t.created_at,
            p.name AS author_name, p.avatar_url AS author_avatar_url,
            (SELECT count(*) FROM comments c WHERE c.thread_id = t.id) AS reply_count
     FROM threads t
     JOIN profiles p ON p.id = t.author_id
     WHERE ($1::uuid IS NULL OR t.issue_id = $1)
     ORDER BY t.created_at DESC`,
        [issueId],
    );
    return Response.json(rows);
}

export async function POST(req: Request) {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    const body = (await req.json().catch(() => null)) as {
        title?: string;
        body?: string;
        category?: string;
        issueId?: string | null;
    } | null;
    if (!body?.title?.trim() || !body.body?.trim()) return badRequest("title and body are required");
    if (!THREAD_CATEGORIES.includes(body.category as (typeof THREAD_CATEGORIES)[number])) {
        return badRequest("invalid category");
    }
    if (body.issueId != null && !UUID_RE.test(body.issueId)) return badRequest("invalid issue id");

    await ensureSchema();
    const sql = db();
    const rows = await sql.query(
        `INSERT INTO threads (title, body, category, issue_id, author_id)
     VALUES ($1, $2, $3, $4::uuid, $5::uuid)
     RETURNING id`,
        [body.title.trim(), body.body.trim(), body.category, body.issueId ?? null, profileId],
    );
    return Response.json({ id: rows[0].id }, { status: 201 });
}
