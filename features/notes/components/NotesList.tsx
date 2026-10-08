"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NotebookPen, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { RelativeTime } from "@/lib/time";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardSkeletonList, EmptyState } from "@/components/shared";
import { useCreateNote, useNotesList } from "../hooks";

export function NotesList({ activeId }: { activeId?: string | undefined }) {
  const { data, isLoading } = useNotesList();
  const create = useCreateNote();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter((n) => !s || n.title.toLowerCase().includes(s) || n.body.toLowerCase().includes(s));
  }, [data, q]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-5">
        <h1 className="text-lg font-semibold">Notes</h1>
        <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending} className="hidden md:inline-flex">
          <Plus className="mr-1 h-4 w-4" /> New note
          <kbd className="ml-2 rounded border border-primary-foreground/30 px-1 font-mono text-[10px]">N</kbd>
        </Button>
      </div>
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" className="pl-8" />
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-6">
        {isLoading ? (
          <CardSkeletonList count={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<NotebookPen className="h-6 w-6" />}
            title={q ? "No matching notes" : "No notes yet"}
            description={q ? "Try a different search." : "Jot down test observations, hunches, and todos. Only you can see them."}
            action={!q && <Button size="sm" onClick={() => create.mutate()}>Create your first note</Button>}
          />
        ) : (
          filtered.map((n) => (
            <Link
              key={n.id}
              href={`/notes/${n.id}`}
              className={cn(
                "block rounded-lg border border-border border-l-2 bg-card px-3.5 py-3 transition-colors hover:bg-secondary/60",
                n.id === activeId ? "border-l-primary bg-secondary/60" : "border-l-transparent",
              )}
            >
              <div className={cn("truncate text-sm font-medium", !n.title && "text-subtle-foreground")}>{n.title || "Untitled"}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{n.body.split("\n").find(Boolean) || "No content"}</div>
              <RelativeTime date={n.updated_at} className="mt-1.5 block text-[11px] text-subtle-foreground" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
