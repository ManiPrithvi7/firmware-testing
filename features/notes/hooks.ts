"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError, UUID_RE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { uploadAttachments } from "@/lib/upload";
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
        queryFn: () => api<Note[]>("/api/notes"),
    });
}

export function useNote(id: string) {
    const { user } = useAuth();
    return useQuery({
        queryKey: notesKeys.one(user?.id ?? "anon", id),
        enabled: !!user,
        queryFn: async () => {
            if (!UUID_RE.test(id)) return null;
            try {
                return await api<Note>(`/api/notes/${id}`);
            } catch (e) {
                // Missing and foreign-owned notes are the identical 404.
                if (e instanceof ApiError && e.status === 404) return null;
                throw e;
            }
        },
    });
}

export function useCreateNote() {
    const { user } = useAuth();
    const router = useRouter();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            if (!user) throw new Error("Not signed in");
            return api<Note>("/api/notes", { method: "POST", body: "{}" });
        },
        onSuccess: (note) => {
            qc.setQueryData(notesKeys.one(note.user_id, note.id), note);
            qc.setQueryData<Note[]>(notesKeys.list(note.user_id), (old) => [note, ...(old ?? [])]);
            router.push(`/notes/${note.id}`);
        },
        onError: (e: Error) => toast.error("Couldn't create note", { description: e.message }),
    });
}

export function useUpdateNote() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Note, "title" | "body" | "issue_id" | "shared_thread_id">> }) => {
            if (!user) throw new Error("Not signed in");
            return api<Note>(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
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
    const router = useRouter();
    return useMutation({
        mutationFn: async (id: string) => {
            if (!user) throw new Error("Not signed in");
            await api(`/api/notes/${id}`, { method: "DELETE" });
            return id;
        },
        onSuccess: (id) => {
            qc.setQueryData<Note[]>(notesKeys.list(user!.id), (old) => (old ?? []).filter((n) => n.id !== id));
            toast.success("Note deleted");
            router.push("/notes");
        },
        onError: (e: Error) => toast.error("Couldn't delete note", { description: e.message }),
    });
}

/** Upload/delete attachments on an existing note, refreshing the note query. */
export function useNoteAttachments(noteId: string) {
    const { user } = useAuth();
    const qc = useQueryClient();
    const refresh = () => qc.invalidateQueries({ queryKey: notesKeys.one(user?.id ?? "anon", noteId) });
    const upload = useMutation({
        mutationFn: (files: File[]) => uploadAttachments("note", noteId, files),
        onSuccess: refresh,
        onError: (e: Error) => toast.error("Couldn't upload attachment", { description: e.message }),
    });
    const remove = useMutation({
        mutationFn: (id: string) => api(`/api/attachments/${id}`, { method: "DELETE" }),
        onSuccess: refresh,
        onError: (e: Error) => toast.error("Couldn't delete attachment", { description: e.message }),
    });
    return { upload, remove };
}

export function useNotesIssueOptions() {
    return useQuery({
        queryKey: ["issues", "options"],
        queryFn: () => api<{ id: string; title: string }[]>("/api/issues/options"),
    });
}

export function useShareNote() {
    const { user } = useAuth();
    const update = useUpdateNote();
    return useMutation({
        mutationFn: async (input: { note: Note; title: string; body: string; category: string; issueId: string | null }) => {
            if (!user) throw new Error("Not signed in");
            // One-way copy: the note stays private; only shared_thread_id is recorded.
            const { id } = await api<{ id: string }>("/api/threads", {
                method: "POST",
                body: JSON.stringify({
                    title: input.title,
                    body: input.body,
                    category: input.category,
                    issueId: input.issueId,
                }),
            });
            await update.mutateAsync({ id: input.note.id, patch: { shared_thread_id: id } });
            return id;
        },
        onSuccess: () => toast.success("Shared to Brainstorm"),
        onError: (e: Error) => toast.error("Couldn't share note", { description: e.message }),
    });
}
