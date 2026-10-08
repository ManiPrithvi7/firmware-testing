import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Note } from "@/lib/types";
import { useDeleteNote, useNotesIssueOptions, useUpdateNote } from "../hooks";
import { ShareToBrainstormDialog } from "./ShareToBrainstormDialog";

type SaveState = "idle" | "saving" | "saved";

export function NoteEditorSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="mt-6 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
      <Skeleton className="mt-2 h-4 w-2/3" />
    </div>
  );
}

export function NoteEditor({ note }: { note: Note }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [save, setSave] = useState<SaveState>("idle");
  const [shareOpen, setShareOpen] = useState(false);
  const update = useUpdateNote();
  const del = useDeleteNote();
  const issues = useNotesIssueOptions();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const first = useRef(true);

  // Debounced autosave (500ms)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSave("saving");
    const t = setTimeout(() => {
      update.mutate(
        { id: note.id, patch: { title, body } },
        { onSuccess: () => setSave("saved"), onError: () => setSave("idle") },
      );
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 240)}px`;
  }, [body]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 lg:px-6">
        <Link to="/notes" className="mr-1 rounded-md p-1.5 text-muted-foreground hover:bg-secondary lg:hidden" aria-label="Back to notes">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="flex items-center gap-1.5 text-xs text-subtle-foreground">
          {save === "saving" ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
          ) : save === "saved" ? (
            <><Check className="h-3 w-3" /> Saved</>
          ) : null}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select
            value={note.issue_id ? String(note.issue_id) : "none"}
            onValueChange={(v) => update.mutate({ id: note.id, patch: { issue_id: v === "none" ? null : Number(v) } })}
          >
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue placeholder="Link to issue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No linked issue</SelectItem>
              {(issues.data ?? []).map((i) => (
                <SelectItem key={i.id} value={String(i.id)}>
                  #{i.id} {i.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {note.shared_thread_id ? (
            <Link
              to="/brainstorm/t/$id"
              params={{ id: note.shared_thread_id }}
              className="inline-flex h-8 items-center rounded-md border border-primary/40 bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/20"
            >
              💡 Shared as thread →
            </Link>
          ) : (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShareOpen(true)}>
              <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share to Brainstorm
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Delete note">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                <AlertDialogDescription>
                  This can't be undone.{note.shared_thread_id ? " The Brainstorm thread you shared stays up." : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => del.mutate(note.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-10">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full border-0 bg-transparent text-[18px] font-semibold outline-none placeholder:text-subtle-foreground"
          autoFocus={!note.title && !note.body}
        />
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Start writing…"
          className="mt-3 w-full resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-subtle-foreground"
        />
      </div>
      <ShareToBrainstormDialog open={shareOpen} onOpenChange={setShareOpen} note={{ ...note, title, body }} />
    </div>
  );
}
