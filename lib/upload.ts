"use client";

// Client upload flow for attachments — same 3-step pattern as issue proofs:
// presign → PUT straight to S3 → register the row.
import { api } from "@/lib/api";
import type { AttachmentParentKind } from "@/lib/attachments";

export async function uploadAttachments(
    kind: AttachmentParentKind,
    parentId: string,
    files: File[],
): Promise<void> {
    for (const file of files) {
        const prep = await api<{ url: string; key: string; contentType: string }>(
            "/api/attachments/presign",
            {
                method: "POST",
                body: JSON.stringify({
                    parentKind: kind,
                    parentId,
                    filename: file.name,
                    fileType: file.type,
                    size: file.size,
                }),
            },
        );
        const put = await fetch(prep.url, {
            method: "PUT",
            body: file,
            headers: { "content-type": prep.contentType },
        });
        if (!put.ok) throw new Error(`Upload failed for ${file.name}`);
        await api("/api/attachments/register", {
            method: "POST",
            body: JSON.stringify({
                parentKind: kind,
                parentId,
                key: prep.key,
                filename: file.name,
                contentType: prep.contentType,
            }),
        });
    }
}
