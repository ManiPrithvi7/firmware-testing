import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { THREAD_CATEGORIES, type Note } from "@/lib/types";
import { useNotesIssueOptions, useShareNote } from "../hooks";

export function ShareToBrainstormDialog({ open, onOpenChange, note }: { open: boolean; onOpenChange: (o: boolean) => void; note: Note }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("Brainstorm");
  const [linkIssue, setLinkIssue] = useState(false);
  const [issueId, setIssueId] = useState<string>("");
  const issues = useNotesIssueOptions();
  const share = useShareNote();

  useEffect(() => {
    if (!open) return;
    setTitle(note.title);
    setBody(note.body);
    setCategory(note.issue_id ? "Issue-linked" : "Brainstorm");
    setLinkIssue(!!note.issue_id);
    setIssueId(note.issue_id ? String(note.issue_id) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const canSubmit = title.trim() && body.trim() && (!linkIssue || issueId);

  const submit = () => {
    share.mutate(
      { note, title: title.trim(), body: body.trim(), category, issueId: linkIssue && issueId ? Number(issueId) : null },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share to Brainstorm</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" /> Sharing creates a copy — your note stays private.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thread title" />
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="share-link">Link to issue</Label>
              <Switch id="share-link" checked={linkIssue} onCheckedChange={setLinkIssue} />
            </div>
            {linkIssue && (
              <Select value={issueId} onValueChange={setIssueId}>
                <SelectTrigger><SelectValue placeholder="Choose an issue" /></SelectTrigger>
                <SelectContent>
                  {(issues.data ?? []).map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>#{i.id} {i.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit || share.isPending}>
            {share.isPending ? "Sharing…" : "Share thread"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
