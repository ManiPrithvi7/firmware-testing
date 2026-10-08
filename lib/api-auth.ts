import { auth } from "@/lib/auth";

/**
 * Security boundary for every /api route handler. The proxy.ts cookie check
 * is UX gating only — handlers must call this and 401 without a session.
 * Returns the Neon profiles.id used to scope all ownership queries.
 */
export async function requireProfileId(): Promise<string | null> {
    const session = await auth();
    return session?.user?.profileId ?? null;
}

export function unauthorized() {
    return Response.json({ error: "unauthorized" }, { status: 401 });
}

export function notFound() {
    // Deliberately identical for missing and foreign-owned rows.
    return Response.json({ error: "not_found" }, { status: 404 });
}

export function badRequest(message: string) {
    return Response.json({ error: message }, { status: 400 });
}
