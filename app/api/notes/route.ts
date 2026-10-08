import { db, ensureSchema } from "@/lib/db";
import { requireProfileId, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    await ensureSchema();
    const sql = db();
    // Owner-scoped (was RLS + .eq('user_id') in the clone — defense in depth kept).
    const rows = await sql`
    SELECT id, user_id, title, body, issue_id, shared_thread_id, created_at, updated_at
    FROM notes
    WHERE user_id = ${profileId}::uuid
    ORDER BY updated_at DESC
  `;
    return Response.json(rows);
}

export async function POST() {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    await ensureSchema();
    const sql = db();
    // Insert-first: the client navigates to /notes/<id> and binds autosave after.
    const rows = await sql`
    INSERT INTO notes (title, body, user_id)
    VALUES ('', '', ${profileId}::uuid)
    RETURNING id, user_id, title, body, issue_id, shared_thread_id, created_at, updated_at
  `;
    return Response.json(rows[0], { status: 201 });
}
