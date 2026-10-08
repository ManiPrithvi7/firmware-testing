import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Note } from "@/lib/types";

export const notesKeys = {
  list: (uid: string) => ["notes", uid] as const,
  one: (uid: string, id: string) => ["notes", uid, id] as const,
};

export function useNotesList() {
  const { user } = useAuth();
  return useQuery({
    queryKey: notesKeys.list(user?.id ?? "anon"),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
  });
}

export function useNote(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: notesKeys.one(user?.id ?? "anon", id),
    enabled: !!user,
    queryFn: async () => {
      const isUuid = /^[0-9a-f-]{36}$/i.test(id);
      if (!isUuid) return null;
      const { data, error } = await supabase.from("notes").select("*").eq("id", id).eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return (data as Note | null) ?? null;
    },
  });
}

export function useCreateNote() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase.from("notes").insert({ title: "", body: "", user_id: user.id }).select().single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: (note) => {
      qc.setQueryData(notesKeys.one(note.user_id, note.id), note);
      qc.setQueryData<Note[]>(notesKeys.list(note.user_id), (old) => [note, ...(old ?? [])]);
      navigate({ to: "/notes/$id", params: { id: note.id } });
    },
    onError: (e: Error) => toast.error("Couldn't create note", { description: e.message }),
  });
}

export function useUpdateNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Note, "title" | "body" | "issue_id" | "shared_thread_id">> }) => {
      const { data, error } = await supabase.from("notes").update(patch).eq("id", id).eq("user_id", user!.id).select().single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: (note) => {
      qc.setQueryData(notesKeys.one(note.user_id, note.id), note);
      qc.setQueryData<Note[]>(notesKeys.list(note.user_id), (old) =>
        [note, ...(old ?? []).filter((n) => n.id !== note.id)],
      );
    },
    onError: (e: Error) => toast.error("Couldn't save note", { description: e.message }),
  });
}

export function useDeleteNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", user!.id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData<Note[]>(notesKeys.list(user!.id), (old) => (old ?? []).filter((n) => n.id !== id));
      toast.success("Note deleted");
      navigate({ to: "/notes" });
    },
    onError: (e: Error) => toast.error("Couldn't delete note", { description: e.message }),
  });
}

export function useNotesIssueOptions() {
  return useQuery({
    queryKey: ["issues", "options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("issues").select("id, title").order("id", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useShareNote() {
  const { user } = useAuth();
  const update = useUpdateNote();
  return useMutation({
    mutationFn: async (input: { note: Note; title: string; body: string; category: string; issueId: number | null }) => {
      const { data, error } = await supabase
        .from("threads")
        .insert({ title: input.title, body: input.body, category: input.category, issue_id: input.issueId, author_id: user!.id })
        .select("id")
        .single();
      if (error) throw error;
      await update.mutateAsync({ id: input.note.id, patch: { shared_thread_id: data.id } });
      return data.id as string;
    },
    onSuccess: () => toast.success("Shared to Brainstorm"),
    onError: (e: Error) => toast.error("Couldn't share note", { description: e.message }),
  });
}
