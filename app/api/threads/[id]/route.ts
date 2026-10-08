import { db, ensureSchema } from "@/lib/db";
import { notFound, requireProfileId, unauthorized } from "@/lib/api-auth";
import { attachmentsFor } from "@/lib/attachments";
import { proofViewUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return notFound();
    await ensureSchema();
    const sql = db();
    const rows = await sql.query(
        `SELECT t.id, t.title, t.body, t.category, t.author_id, t.issue_id, t.created_at,
            json_build_object('name', p.name, 'avatar_url', p.avatar_url) AS author
     FROM threads t
     JOIN profiles p ON p.id = t.author_id
     WHERE t.id = $1::uuid`,
        [id],
    );
    if (rows.length === 0) return notFound();
    const attachments = await Promise.all(
        (await attachmentsFor("thread", id)).map(async (a) => ({ ...a, url: await proofViewUrl(a.object_key) })),
    );
    return Response.json({ ...rows[0], attachments });
}

export async function DELETE(_req: Request, ctx: Ctx) {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return notFound();
    await ensureSchema();
    const sql = db();
    // Author-only. notes.shared_thread_id references threads ON DELETE SET NULL,
    // so deleting a thread clears the note's "Shared as thread" badge gracefully.
    const rows = await sql.query(
        `DELETE FROM threads WHERE id = $1::uuid AND author_id = $2::uuid RETURNING id`,
        [id, profileId],
    );
    if (rows.length === 0) return notFound();
    return Response.json({ ok: true });
}
