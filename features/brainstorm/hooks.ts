"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError, UUID_RE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AuthorRef, Comment, Thread, ThreadListItem } from "@/lib/types";

export type ThreadWithAuthor = Thread & { author: AuthorRef };
export type CommentWithAuthor = Comment & { author: AuthorRef };

export const bsKeys = {
    threads: (issueId: string | null) => ["threads", issueId ?? "all"] as const,
    thread: (id: string) => ["thread", id] as const,
    comments: (id: string, limit: number) => ["comments", id, limit] as const,
};

export function useThreads(issueId: string | null) {
    return useQuery({
        queryKey: bsKeys.threads(issueId),
        queryFn: () => api<ThreadListItem[]>(issueId ? `/api/threads?issue=${issueId}` : "/api/threads"),
    });
}

export function useThread(id: string) {
    return useQuery({
        queryKey: bsKeys.thread(id),
        queryFn: async () => {
            if (!UUID_RE.test(id)) return null;
            try {
                return await api<ThreadWithAuthor>(`/api/threads/${id}`);
            } catch (e) {
                if (e instanceof ApiError && e.status === 404) return null;
                throw e;
            }
        },
    });
}

export function useComments(threadId: string, limit: number) {
    return useQuery({
        queryKey: bsKeys.comments(threadId, limit),
        placeholderData: keepPreviousData,
        queryFn: () => api<{ comments: CommentWithAuthor[]; total: number }>(`/api/threads/${threadId}/comments?limit=${limit}`),
    });
}

export function useAddComment(threadId: string) {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ body, parentId }: { body: string; parentId?: string | null | undefined }) => {
            if (!user) throw new Error("Not signed in");
            const { id } = await api<{ id: string }>(`/api/threads/${threadId}/comments`, {
                method: "POST",
                body: JSON.stringify({ body, parentId: parentId ?? null }),
            });
            return id;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["comments", threadId] });
            qc.invalidateQueries({ queryKey: ["threads"] });
            toast.success("Comment posted");
        },
        onError: (e: Error) => toast.error("Couldn't post comment", { description: e.message }),
    });
}

export function useCreateThread() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { title: string; body: string; category: string; issueId: string | null }) => {
            if (!user) throw new Error("Not signed in");
            const { id } = await api<{ id: string }>("/api/threads", {
                method: "POST",
                body: JSON.stringify(input),
            });
            return id;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["threads"] });
            toast.success("Thread created");
        },
        onError: (e: Error) => toast.error("Couldn't create thread", { description: e.message }),
    });
}

/** Author-only thread delete (server enforces). Cascades to comments; notes
 *  that shared the thread keep their content — their badge clears via SET NULL. */
export function useDeleteThread() {
    const { user } = useAuth();
    const qc = useQueryClient();
    const router = useRouter();
    return useMutation({
        mutationFn: async (id: string) => {
            if (!user) throw new Error("Not signed in");
            await api(`/api/threads/${id}`, { method: "DELETE" });
            return id;
        },
        onSuccess: (id) => {
            qc.invalidateQueries({ queryKey: ["threads"] });
            qc.removeQueries({ queryKey: bsKeys.thread(id) });
            toast.success("Thread deleted");
            router.push("/brainstorm");
        },
        onError: (e: Error) => toast.error("Couldn't delete thread", { description: e.message }),
    });
}

export function useBrainstormIssues() {
    return useQuery({
        queryKey: ["issues", "options"],
        queryFn: () => api<{ id: string; title: string }[]>("/api/issues/options"),
    });
}
