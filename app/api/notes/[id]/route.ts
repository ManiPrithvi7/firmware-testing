import { db, ensureSchema } from "@/lib/db";
import { badRequest, notFound, requireProfileId, unauthorized } from "@/lib/api-auth";
import { attachmentsFor } from "@/lib/attachments";
import { proofViewUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const COLUMNS = "id, user_id, title, body, issue_id, shared_thread_id, created_at, updated_at";
const PATCHABLE = ["title", "body", "issue_id", "shared_thread_id"] as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return notFound();
    await ensureSchema();
    const sql = db();
    const rows = await sql.query(
        `SELECT ${COLUMNS} FROM notes WHERE id = $1::uuid AND user_id = $2::uuid`,
        [id, profileId],
    );
    if (rows.length === 0) return notFound();
    const attachments = await Promise.all(
        (await attachmentsFor("note", id)).map(async (a) => ({ ...a, url: await proofViewUrl(a.object_key) })),
    );
    return Response.json({ ...rows[0], attachments });
}

export async function PATCH(req: Request, ctx: Ctx) {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return notFound();

    const patch = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!patch) return badRequest("invalid body");

    const sets: string[] = [];
    const values: unknown[] = [];
    for (const key of PATCHABLE) {
        if (key in patch) {
            values.push(patch[key]);
            sets.push(`${key} = $${values.length}`);
        }
    }
    if (sets.length === 0) return badRequest("nothing to update");

    await ensureSchema();
    const sql = db();
    // updated_at is always bumped explicitly (replaces the clone's moddatetime trigger).
    values.push(id, profileId);
    const rows = await sql.query(
        `UPDATE notes SET ${sets.join(", ")}, updated_at = now()
     WHERE id = $${values.length - 1}::uuid AND user_id = $${values.length}::uuid
     RETURNING ${COLUMNS}`,
        values,
    );
    if (rows.length === 0) return notFound();
    return Response.json(rows[0]);
}

export async function DELETE(_req: Request, ctx: Ctx) {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return notFound();
    await ensureSchema();
    const sql = db();
    // shared_thread_id is a one-way copy: deleting the note leaves the thread intact.
    const rows = await sql.query(
        `DELETE FROM notes WHERE id = $1::uuid AND user_id = $2::uuid RETURNING id`,
        [id, profileId],
    );
    if (rows.length === 0) return notFound();
    return Response.json({ ok: true });
}
