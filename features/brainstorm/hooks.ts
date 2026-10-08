import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { AuthorRef, Comment, Thread, ThreadListItem } from "@/lib/types";

export type ThreadWithAuthor = Thread & { author: AuthorRef };
export type CommentWithAuthor = Comment & { author: AuthorRef };

export const bsKeys = {
  threads: (issueId: number | null) => ["threads", issueId ?? "all"] as const,
  thread: (id: string) => ["thread", id] as const,
  comments: (id: string, limit: number) => ["comments", id, limit] as const,
};

export function useThreads(issueId: number | null) {
  return useQuery({
    queryKey: bsKeys.threads(issueId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_threads", issueId ? { p_issue_id: issueId } : {});
      if (error) throw error;
      return (data ?? []) as ThreadListItem[];
    },
  });
}

export function useThread(id: string) {
  return useQuery({
    queryKey: bsKeys.thread(id),
    queryFn: async () => {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const { data, error } = await supabase
        .from("threads")
        .select("*, author:profiles!threads_author_id_fkey(name, avatar_url)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as ThreadWithAuthor | null) ?? null;
    },
  });
}

export function useComments(threadId: string, limit: number) {
  return useQuery({
    queryKey: bsKeys.comments(threadId, limit),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("comments")
        .select("*, author:profiles!comments_author_id_fkey(name, avatar_url)", { count: "exact" })
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .range(0, limit - 1);
      if (error) throw error;
      return { comments: (data ?? []) as CommentWithAuthor[], total: count ?? 0 };
    },
  });
}

export function useAddComment(threadId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, parentId }: { body: string; parentId?: string | null | undefined }) => {
      const { error } = await supabase
        .from("comments")
        .insert({ thread_id: threadId, parent_id: parentId ?? null, body, author_id: user!.id });
      if (error) throw error;
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
    mutationFn: async (input: { title: string; body: string; category: string; issueId: number | null }) => {
      const { data, error } = await supabase
        .from("threads")
        .insert({ title: input.title, body: input.body, category: input.category, issue_id: input.issueId, author_id: user!.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      toast.success("Thread created");
    },
    onError: (e: Error) => toast.error("Couldn't create thread", { description: e.message }),
  });
}

export function useBrainstormIssues() {
  return useQuery({
    queryKey: ["issues", "options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("issues").select("id, title").order("id", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
