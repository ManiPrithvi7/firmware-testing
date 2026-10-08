import { db, ensureSchema } from "@/lib/db";
import { badRequest, notFound, requireProfileId, unauthorized } from "@/lib/api-auth";
import { attachmentsForComments } from "@/lib/attachments";
import { proofViewUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const MAX_LIMIT = 200;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return notFound();

    const rawLimit = Number(new URL(req.url).searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, Math.floor(rawLimit)), MAX_LIMIT) : 20;

    await ensureSchema();
    const sql = db();
    const [comments, countRows] = await Promise.all([
        sql.query(
            `SELECT c.id, c.thread_id, c.parent_id, c.author_id, c.body, c.created_at,
              json_build_object('name', p.name, 'avatar_url', p.avatar_url) AS author
       FROM comments c
       JOIN profiles p ON p.id = c.author_id
       WHERE c.thread_id = $1::uuid
       ORDER BY c.created_at ASC
       LIMIT $2`,
            [id, limit],
        ),
        sql.query(`SELECT count(*)::int AS total FROM comments WHERE thread_id = $1::uuid`, [id]),
    ]);
    const byComment = await attachmentsForComments(comments.map((c) => c.id as string));
    const withAttachments = await Promise.all(
        comments.map(async (c) => ({
            ...c,
            attachments: await Promise.all(
                (byComment.get(c.id as string) ?? []).map(async (a) => ({
                    ...a,
                    url: await proofViewUrl(a.object_key),
                })),
            ),
        })),
    );
    return Response.json({ comments: withAttachments, total: countRows[0]?.total ?? 0 });
}

export async function POST(req: Request, ctx: Ctx) {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return notFound();

    const body = (await req.json().catch(() => null)) as { body?: string; parentId?: string | null } | null;
    if (!body?.body?.trim()) return badRequest("body is required");
    if (body.parentId != null && !UUID_RE.test(body.parentId)) return badRequest("invalid parent id");

    await ensureSchema();
    const sql = db();

    const thread = await sql.query(`SELECT id FROM threads WHERE id = $1::uuid`, [id]);
    if (thread.length === 0) return notFound();

    // Validate parent belongs to this thread in the handler → 400.
    // The assert_parent_in_thread trigger stays as a backstop and must never surface as a 500.
    if (body.parentId) {
        const parent = await sql.query(`SELECT thread_id FROM comments WHERE id = $1::uuid`, [body.parentId]);
        if (parent.length === 0 || parent[0].thread_id !== id) {
            return badRequest("parent comment belongs to a different thread");
        }
    }

    const rows = await sql.query(
        `INSERT INTO comments (thread_id, parent_id, author_id, body)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
     RETURNING id`,
        [id, body.parentId ?? null, profileId, body.body.trim()],
    );
    return Response.json({ id: rows[0].id }, { status: 201 });
}
