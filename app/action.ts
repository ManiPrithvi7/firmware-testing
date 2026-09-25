"use server";

import { revalidatePath } from "next/cache";
import {
    isPriority,
    isStatus,
    MAX_PROOF_BYTES,
    PROOF_TYPES,
} from "@/lib/constants";
import { db, ensureSchema, getProofKeys } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { deleteProofObject, deleteProofObjects, uploadProof } from "@/lib/storage";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): ActionResult {
    return { ok: false, error: safeError(error) };
}

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );
}

export async function createIssue(formData: FormData): Promise<ActionResult> {
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const steps = String(formData.get("steps") ?? "").trim();
    const priority = String(formData.get("priority") ?? "medium");
    const proofs = formData
        .getAll("proof")
        .filter((item): item is File => item instanceof File && item.size > 0);

    if (!title) return { ok: false, error: "Give the finding a title." };
    if (title.length > 160) return { ok: false, error: "Title is too long." };
    if (!isPriority(priority)) {
        return { ok: false, error: "Pick a valid priority." };
    }

    try {
        await ensureSchema();
        const sql = db();
        const rows = await sql`
      INSERT INTO issues (title, description, steps, area, priority, owner)
      VALUES (${title}, ${description}, ${steps}, 'other', ${priority}, '')
      RETURNING id
    `;
        const issueId = String(rows[0]?.id ?? "");
        if (!isUuid(issueId)) throw new Error("Could not create the finding.");

        for (const proof of proofs) {
            const attached = await attachProofToIssue(issueId, proof);
            if (!attached.ok) {
                const keys = await getProofKeys(issueId);
                await deleteProofObjects(keys);
                await sql`DELETE FROM issues WHERE id = ${issueId}::uuid`;
                return attached;
            }
        }

        revalidatePath("/");
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

export async function updateIssueStatus(
    issueId: string,
    status: string,
): Promise<ActionResult> {
    if (!isUuid(issueId) || !isStatus(status)) {
        return { ok: false, error: "That status is not valid." };
    }
    try {
        await ensureSchema();
        const sql = db();
        await sql`
      UPDATE issues
      SET status = ${status}, updated_at = now()
      WHERE id = ${issueId}::uuid
    `;
        revalidatePath("/");
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

export async function updateIssuePriority(
    issueId: string,
    priority: string,
): Promise<ActionResult> {
    if (!isUuid(issueId) || !isPriority(priority)) {
        return { ok: false, error: "That severity is not valid." };
    }
    try {
        await ensureSchema();
        const sql = db();
        await sql`
      UPDATE issues
      SET priority = ${priority}, updated_at = now()
      WHERE id = ${issueId}::uuid
    `;
        revalidatePath("/");
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

export async function deleteIssue(issueId: string): Promise<ActionResult> {
    if (!isUuid(issueId)) return { ok: false, error: "Unknown finding." };
    try {
        const keys = await getProofKeys(issueId);
        await deleteProofObjects(keys);
        const sql = db();
        await sql`DELETE FROM issues WHERE id = ${issueId}::uuid`;
        revalidatePath("/");
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

export async function addTodo(formData: FormData): Promise<ActionResult> {
    const issueId = String(formData.get("issueId") ?? "");
    const title = String(formData.get("title") ?? "").trim();
    if (!isUuid(issueId)) return { ok: false, error: "Unknown finding." };
    if (!title) return { ok: false, error: "Write the next action." };
    if (title.length > 200) return { ok: false, error: "That action is too long." };

    try {
        await ensureSchema();
        const sql = db();
        await sql`
      INSERT INTO todos (issue_id, title, position)
      VALUES (
        ${issueId}::uuid,
        ${title},
        COALESCE((SELECT MAX(position) + 1 FROM todos WHERE issue_id = ${issueId}::uuid), 0)
      )
    `;
        await sql`
      UPDATE issues SET updated_at = now() WHERE id = ${issueId}::uuid
    `;
        revalidatePath("/");
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

export async function toggleTodo(todoId: string, done: boolean): Promise<ActionResult> {
    if (!isUuid(todoId)) return { ok: false, error: "Unknown action." };
    try {
        await ensureSchema();
        const sql = db();
        await sql`
      UPDATE todos SET done = ${done} WHERE id = ${todoId}::uuid
    `;
        await sql`
      UPDATE issues SET updated_at = now()
      WHERE id = (SELECT issue_id FROM todos WHERE id = ${todoId}::uuid)
    `;
        revalidatePath("/");
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

export async function deleteTodo(todoId: string): Promise<ActionResult> {
    if (!isUuid(todoId)) return { ok: false, error: "Unknown action." };
    try {
        await ensureSchema();
        const sql = db();
        await sql`DELETE FROM todos WHERE id = ${todoId}::uuid`;
        revalidatePath("/");
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

export async function uploadIssueProof(formData: FormData): Promise<ActionResult> {
    const issueId = String(formData.get("issueId") ?? "");
    const file = formData.get("proof");
    if (!isUuid(issueId)) return { ok: false, error: "Unknown finding." };
    if (!(file instanceof File) || file.size === 0) {
        return { ok: false, error: "Choose a photo or video." };
    }

    try {
        await ensureSchema();
        const sql = db();
        const existing = await sql`SELECT id FROM issues WHERE id = ${issueId}::uuid`;
        if (existing.length === 0) return { ok: false, error: "That finding is gone." };

        const result = await attachProofToIssue(issueId, file);
        if (result.ok) revalidatePath("/");
        return result;
    } catch (error) {
        return fail(error);
    }
}

async function attachProofToIssue(issueId: string, file: File): Promise<ActionResult> {
    const contentType = normalizeProofType(file);
    if (!PROOF_TYPES.has(contentType)) {
        return { ok: false, error: "Proofs must be a photo (JPEG, PNG, WebP, GIF) or a video (MP4, WebM, MOV)." };
    }
    if (file.size > MAX_PROOF_BYTES) {
        return { ok: false, error: "Each file must be 80 MB or smaller." };
    }

    const extension = extensionFor(contentType);
    const key = `issues/${issueId}/${crypto.randomUUID()}${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sql = db();

    await uploadProof(key, bytes, contentType);
    try {
        await sql`
      INSERT INTO proofs (issue_id, object_key, filename, content_type)
      VALUES (${issueId}::uuid, ${key}, ${file.name.slice(0, 180)}, ${contentType})
    `;
        await sql`UPDATE issues SET updated_at = now() WHERE id = ${issueId}::uuid`;
    } catch (error) {
        await deleteProofObject(key).catch(() => undefined);
        throw error;
    }
    return { ok: true };
}

export async function deleteProof(proofId: string): Promise<ActionResult> {
    if (!isUuid(proofId)) return { ok: false, error: "Unknown proof." };
    try {
        await ensureSchema();
        const sql = db();
        const rows = await sql`
      SELECT object_key FROM proofs WHERE id = ${proofId}::uuid
    `;
        const key = rows[0]?.object_key;
        if (typeof key === "string") await deleteProofObject(key);
        await sql`DELETE FROM proofs WHERE id = ${proofId}::uuid`;
        revalidatePath("/");
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
}

function normalizeProofType(file: File) {
    if (PROOF_TYPES.has(file.type)) return file.type;
    const ext = file.name.split(".").pop()?.toLowerCase();
    switch (ext) {
        case "jpg":
        case "jpeg":
            return "image/jpeg";
        case "png":
            return "image/png";
        case "webp":
            return "image/webp";
        case "gif":
            return "image/gif";
        case "mp4":
            return "video/mp4";
        case "webm":
            return "video/webm";
        case "mov":
            return "video/quicktime";
        default:
            return file.type;
    }
}

function extensionFor(type: string) {
    switch (type) {
        case "image/jpeg":
            return ".jpg";
        case "image/png":
            return ".png";
        case "image/webp":
            return ".webp";
        case "image/gif":
            return ".gif";
        case "video/mp4":
            return ".mp4";
        case "video/webm":
            return ".webm";
        case "video/quicktime":
            return ".mov";
        default:
            return "";
    }
}
