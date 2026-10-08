import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

export type Issue = Tables["issues"]["Row"];
export type Note = Tables["notes"]["Row"];
export type Thread = Tables["threads"]["Row"];
export type Comment = Tables["comments"]["Row"];
export type Profile = Tables["profiles"]["Row"];
export type ThreadListItem = Database["public"]["Functions"]["list_threads"]["Returns"][number];

export const SEVERITIES = ["Critical", "High", "Medium", "Low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const ISSUE_STATUSES = ["Open", "In progress", "Blocked", "Done"] as const;

export const THREAD_CATEGORIES = ["Brainstorm", "Help", "Issue-linked"] as const;
export type ThreadCategory = (typeof THREAD_CATEGORIES)[number];

export type AuthorRef = { name: string | null; avatar_url: string | null } | null;
