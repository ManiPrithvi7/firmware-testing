import { badRequest, notFound, requireProfileId, unauthorized } from "@/lib/api-auth";
import { canAttach, ATTACHMENT_PARENTS, type AttachmentParentKind } from "@/lib/attachments";
import { MAX_PROOF_BYTES, PROOF_TYPES } from "@/lib/constants";
import { db, ensureSchema } from "@/lib/db";
import { deleteProofObject, proofObjectSize } from "@/lib/storage";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

// Step 3 of the upload flow: verify the object actually landed in S3, then
// record the row. Mirrors registerProof in app/action.ts.
export async function POST(req: Request) {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();

    const body = (await req.json().catch(() => null)) as {
        parentKind?: AttachmentParentKind;
        parentId?: string;
        key?: string;
        filename?: string;
        contentType?: string;
    } | null;
    if (!body || !body.parentKind || !(body.parentKind in ATTACHMENT_PARENTS)) {
        return badRequest("invalid parent");
    }
    if (!body.parentId || !UUID_RE.test(body.parentId)) return notFound();
    const prefix = `${ATTACHMENT_PARENTS[body.parentKind].keyPrefix}/${body.parentId}/`;
    if (!body.key?.startsWith(prefix)) return badRequest("That upload is not valid.");
    if (!body.contentType || !PROOF_TYPES.has(body.contentType)) {
        return badRequest("That file type is not allowed.");
    }
    if (!(await canAttach(body.parentKind, body.parentId, profileId))) return notFound();

    const size = await proofObjectSize(body.key);
    if (size <= 0 || size > MAX_PROOF_BYTES) {
        await deleteProofObject(body.key).catch(() => undefined);
        return badRequest("Each file must be 80 MB or smaller.");
    }

    await ensureSchema();
    const sql = db();
    const column = ATTACHMENT_PARENTS[body.parentKind].column;
    const rows = await sql.query(
        `INSERT INTO attachments (owner_id, ${column}, object_key, filename, content_type)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5)
     RETURNING id, object_key, filename, content_type, created_at`,
        [profileId, body.parentId, body.key, (body.filename ?? "file").slice(0, 180), body.contentType],
    );
    return Response.json(rows[0], { status: 201 });
}
