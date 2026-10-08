// Shared types for Notes + Brainstorm. Mirrors the Neon schema in lib/db.ts.
// issue_id is a uuid string referencing the existing issues table.

export type Profile = {
    id: string;
    email: string | null;
    name: string | null;
    avatar_url: string | null;
    created_at: string;
};

export type Note = {
    id: string;
    user_id: string;
    title: string;
    body: string;
    issue_id: string | null;
    shared_thread_id: string | null;
    created_at: string;
    updated_at: string;
};

export type Thread = {
    id: string;
    title: string;
    body: string;
    category: string;
    author_id: string;
    issue_id: string | null;
    created_at: string;
};

export type Comment = {
    id: string;
    thread_id: string;
    parent_id: string | null;
    author_id: string;
    body: string;
    created_at: string;
};

/** Row shape returned by GET /api/threads (SQL port of the clone's list_threads RPC). */
export type ThreadListItem = {
    id: string;
    title: string;
    body: string;
    category: string;
    issue_id: string | null;
    created_at: string;
    author_name: string | null;
    author_avatar_url: string | null;
    reply_count: number;
};

export const THREAD_CATEGORIES = ["Brainstorm", "Help", "Issue-linked"] as const;
export type ThreadCategory = (typeof THREAD_CATEGORIES)[number];

export type AuthorRef = { name: string | null; avatar_url: string | null } | null;
