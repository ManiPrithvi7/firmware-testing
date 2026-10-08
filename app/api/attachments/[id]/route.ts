import { notFound, requireProfileId, unauthorized } from "@/lib/api-auth";
import { db, ensureSchema } from "@/lib/db";
import { deleteProofObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

type Ctx = { params: Promise<{ id: string }> };

// Owner-only delete: removes the S3 object and the row.
export async function DELETE(_req: Request, ctx: Ctx) {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return notFound();

    await ensureSchema();
    const sql = db();
    const rows = await sql.query(
        `DELETE FROM attachments WHERE id = $1::uuid AND owner_id = $2::uuid
     RETURNING object_key`,
        [id, profileId],
    );
    if (rows.length === 0) return notFound();
    await deleteProofObject(rows[0].object_key).catch(() => undefined);
    return Response.json({ ok: true });
}
