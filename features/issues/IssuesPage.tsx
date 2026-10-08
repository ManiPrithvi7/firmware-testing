import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, ChevronDown, MessageSquare, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { on } from "@/lib/events";
import { RelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ISSUE_STATUSES, SEVERITIES, type Issue } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CardSkeletonList, Chip, EmptyState, SeverityChip, StatusIndicator } from "@/components/shared";

const RESPONSIBLE = ["Firmware", "Enclosure", "Electrical/Mechanical"];

function useIssues() {
  return useQuery({
    queryKey: ["issues", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("issues").select("*").order("id", { ascending: false });
      if (error) throw error;
      return data as Issue[];
    },
  });
}

export function IssuesPage() {
  const { data, isLoading } = useIssues();
  const [status, setStatus] = useState("All");
  const [sevs, setSevs] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const auth = useAuth();

  const startLog = () => (auth.user ? setOpen(true) : auth.requireSignIn("Sign in to log an issue", "/issues"));
  useEffect(() => on("ftl:log-issue", startLog));

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter(
      (i) =>
        (status === "All" || i.status === status) &&
        (!sevs.length || sevs.includes(i.severity)) &&
        (!s || `${i.id} ${i.title} ${i.description ?? ""}`.toLowerCase().includes(s)),
    );
  }, [data, status, sevs, q]);

  return (
    <div className="mx-auto w-full max-w-[var(--content-max)] px-4 py-6 md:px-8">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold">Firmware Test Log</h1>
        <Button className="ml-auto hidden md:inline-flex" onClick={startLog}>
          <Plus className="mr-1 h-4 w-4" /> Log Issue
        </Button>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {["All", ...ISSUE_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium", status === s ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}
          >
            {s}
          </button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Severity{sevs.length ? ` (${sevs.length})` : ""} <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {SEVERITIES.map((s) => (
              <DropdownMenuCheckboxItem key={s} checked={sevs.includes(s)} onCheckedChange={(c) => setSevs((p) => (c ? [...p, s] : p.filter((x) => x !== s)))}>
                {s}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="relative ml-auto w-full sm:w-60">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search issues" className="h-8 pl-8" />
        </div>
      </div>

      {isLoading ? (
        <CardSkeletonList count={5} />
      ) : !list.length ? (
        <EmptyState icon={<Bug className="h-6 w-6" />} title="No issues match" description="Adjust filters or log a new issue." action={<Button size="sm" onClick={startLog}>Log Issue</Button>} />
      ) : (
        <div className="space-y-3">
          {list.map((i) => (
            <div key={i.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="pt-0.5 font-mono text-xs text-subtle-foreground">#{i.id}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold">{i.title}</h3>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{i.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {i.category.split(",").map((c) => <Chip key={c}>{c.trim()}</Chip>)}
                    <SeverityChip severity={i.severity} />
                    <StatusIndicator status={i.status} />
                    <RelativeTime date={i.created_at} className="text-xs text-subtle-foreground" />
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link to="/brainstorm" search={{ issue: i.id }}>
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Discuss
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <LogIssueDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function LogIssueDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [resp, setResp] = useState<string[]>([]);
  const [severity, setSeverity] = useState("Medium");
  const [what, setWhat] = useState("");
  const [steps, setSteps] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const { displayName } = useAuth();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async () => {
      const { data: top } = await supabase.from("issues").select("id").order("id", { ascending: false }).limit(1);
      const id = (top?.[0]?.id ?? 0) + 1;
      const description = steps.trim() ? `${what.trim()}\n\nSteps to reproduce:\n${steps.trim()}` : what.trim();
      const { error } = await supabase.from("issues").insert({ id, title: title.trim(), description, category: resp.join(", "), severity, reporter: displayName });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issues"] });
      toast.success("Issue logged");
      onOpenChange(false);
      setTitle(""); setResp([]); setWhat(""); setSteps(""); setFiles([]);
    },
    onError: (e: Error) => toast.error("Couldn't log issue", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Log issue</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Responsible</Label>
            <div className="flex flex-wrap gap-4">
              {RESPONSIBLE.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={resp.includes(r)} onCheckedChange={(c) => setResp((p) => (c ? [...p, r] : p.filter((x) => x !== r)))} /> {r}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>What happened</Label><Textarea value={what} onChange={(e) => setWhat(e.target.value)} rows={3} /></div>
          <div className="space-y-1.5"><Label>Steps to reproduce</Label><Textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={3} /></div>
          <div className="space-y-1.5">
            <Label>Attachments</Label>
            <Input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))} />
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">{files.map((u) => <img key={u} src={u} alt="" className="h-16 w-16 rounded-md border border-border object-cover" />)}</div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={!title.trim() || !resp.length || !what.trim() || m.isPending}>{m.isPending ? "Logging…" : "Log issue"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
