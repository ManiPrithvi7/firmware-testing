"use client";

// Client fetch helper for the feature hooks. Mirrors the shape of the clone's
// supabase calls: throws on error, returns parsed JSON on success.
export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message);
    }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
        ...init,
        headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (res.status === 401) {
        // Session expired mid-use — back through the gate, preserving the target.
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
        throw new ApiError(401, "unauthorized");
    }
    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new ApiError(res.status, body.error ?? res.statusText);
    }
    return res.json() as Promise<T>;
}

export const UUID_RE = /^[0-9a-f-]{36}$/i;
