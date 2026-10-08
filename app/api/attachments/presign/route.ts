import { badRequest, notFound, requireProfileId, unauthorized } from "@/lib/api-auth";
import { canAttach, ATTACHMENT_PARENTS, type AttachmentParentKind } from "@/lib/attachments";
import { extensionFor, MAX_PROOF_BYTES, normalizeProofType, PROOF_TYPES } from "@/lib/constants";
import { proofUploadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

// Step 1 of the upload flow (same pattern as issue proofs): validate, then
// return a presigned PUT URL. The client uploads straight to S3, then calls
// /api/attachments/register.
export async function POST(req: Request) {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();

    const body = (await req.json().catch(() => null)) as {
        parentKind?: AttachmentParentKind;
        parentId?: string;
        filename?: string;
        fileType?: string;
        size?: number;
    } | null;
    if (!body || !body.parentKind || !(body.parentKind in ATTACHMENT_PARENTS)) {
        return badRequest("invalid parent");
    }
    if (!body.parentId || !UUID_RE.test(body.parentId)) return notFound();
    if (!body.filename) return badRequest("Choose a photo or video.");

    const contentType = normalizeProofType(body.filename, body.fileType ?? "");
    if (!PROOF_TYPES.has(contentType)) {
        return badRequest("Attachments must be a photo (JPEG, PNG, WebP, GIF) or a video (MP4, WebM, MOV).");
    }
    if (!Number.isFinite(body.size) || !body.size || body.size <= 0) {
        return badRequest("Choose a photo or video.");
    }
    if (body.size > MAX_PROOF_BYTES) {
        return badRequest("Each file must be 80 MB or smaller.");
    }

    if (!(await canAttach(body.parentKind, body.parentId, profileId))) return notFound();

    const key = `${ATTACHMENT_PARENTS[body.parentKind].keyPrefix}/${body.parentId}/${crypto.randomUUID()}${extensionFor(contentType)}`;
    const url = await proofUploadUrl(key, contentType);
    return Response.json({ url, key, contentType });
}
