import { db, ensureSchema } from "@/lib/db";
import { requireProfileId, unauthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// Options for the note "Link to issue" picker and the Share/NewThread dialogs.
// Reads the app's existing Neon issues table — never hardcoded.
export async function GET() {
    const profileId = await requireProfileId();
    if (!profileId) return unauthorized();
    await ensureSchema();
    const sql = db();
    const rows = await sql`
    SELECT id, title FROM issues ORDER BY created_at DESC
  `;
    return Response.json(rows);
}
