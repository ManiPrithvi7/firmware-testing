// Server-side helpers for note/thread/comment attachments.
import { db, ensureSchema } from "@/lib/db";

export type AttachmentParentKind = "note" | "thread" | "comment";

export const ATTACHMENT_PARENTS: Record<
    AttachmentParentKind,
    { table: string; column: string; keyPrefix: string }
> = {
    note: { table: "notes", column: "note_id", keyPrefix: "notes" },
    thread: { table: "threads", column: "thread_id", keyPrefix: "threads" },
    comment: { table: "comments", column: "comment_id", keyPrefix: "comments" },
};

/**
 * Verify the parent row exists AND the caller may attach to it.
 * Notes are owner-only (private); threads/comments are author-only.
 * Returns false for missing or foreign parents — callers map this to the
 * same uniform 404 as a nonexistent row.
 */
export async function canAttach(
    kind: AttachmentParentKind,
    parentId: string,
    profileId: string,
): Promise<boolean> {
    await ensureSchema();
    const sql = db();
    const { table } = ATTACHMENT_PARENTS[kind];
    const ownerColumn = kind === "note" ? "user_id" : "author_id";
    const rows = await sql.query(
        `SELECT id FROM ${table} WHERE id = $1::uuid AND ${ownerColumn} = $2::uuid`,
        [parentId, profileId],
    );
    return rows.length > 0;
}

type AttachmentRow = {
    id: string;
    object_key: string;
    filename: string;
    content_type: string;
    created_at: string;
};

export async function attachmentsFor(
    kind: AttachmentParentKind,
    parentId: string,
): Promise<AttachmentRow[]> {
    await ensureSchema();
    const sql = db();
    const { column } = ATTACHMENT_PARENTS[kind];
    const rows = await sql.query(
        `SELECT id, object_key, filename, content_type, created_at
     FROM attachments WHERE ${column} = $1::uuid ORDER BY created_at ASC`,
        [parentId],
    );
    return rows as unknown as AttachmentRow[];
}

export async function attachmentsForComments(commentIds: string[]) {
    if (commentIds.length === 0) return new Map<string, AttachmentRow[]>();
    await ensureSchema();
    const sql = db();
    const rows = (await sql.query(
        `SELECT id, comment_id, object_key, filename, content_type, created_at
     FROM attachments WHERE comment_id = ANY($1::uuid[]) ORDER BY created_at ASC`,
        [commentIds],
    )) as unknown as (AttachmentRow & { comment_id: string })[];
    const map = new Map<string, AttachmentRow[]>();
    for (const row of rows) {
        const list = map.get(row.comment_id) ?? [];
        list.push(row);
        map.set(row.comment_id, list);
    }
    return map;
}
