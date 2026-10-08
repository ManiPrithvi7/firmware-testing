"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { on, type NewThreadPreset } from "@/lib/events";
import { THREAD_CATEGORIES } from "@/lib/types";
import { useBrainstormIssues, useCreateThread } from "../hooks";

/** Mounted once by the shell; opens on the `ftl:new-thread` event. */
export function NewThreadDialogHost() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Brainstorm");
  const [issueId, setIssueId] = useState("none");
  const issues = useBrainstormIssues();
  const create = useCreateThread();
  const router = useRouter();

  useEffect(
    () =>
      on("ftl:new-thread", (preset?: NewThreadPreset) => {
        setTitle(preset?.title ?? "");
        setBody(preset?.body ?? "");
        setCategory(preset?.category ?? (preset?.issueId ? "Issue-linked" : "Brainstorm"));
        setIssueId(preset?.issueId ? String(preset.issueId) : "none");
        setOpen(true);
      }),
    [],
  );

  const submit = () =>
    create.mutate(
      { title: title.trim(), body: body.trim(), category, issueId: issueId === "none" ? null : issueId },
      {
        onSuccess: (id) => {
          setOpen(false);
          router.push(`/brainstorm/t/${id}`);
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New thread</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to discuss?" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <div className="flex gap-2">
              {THREAD_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium",
                    category === c ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Link to issue</Label>
            <Select value={issueId} onValueChange={(v) => setIssueId(v ?? "none")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked issue</SelectItem>
                {(issues.data ?? []).map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Add context, ideas, or questions…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!title.trim() || !body.trim() || create.isPending}>
            {create.isPending ? "Posting…" : "Post thread"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
