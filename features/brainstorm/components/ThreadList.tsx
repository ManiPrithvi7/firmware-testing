import { Link } from "@tanstack/react-router";
import { ArrowLeft, Lightbulb, MessageSquare, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { emit } from "@/lib/events";
import { RelativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { CardSkeletonList, Chip, EmptyState, UserAvatar } from "@/components/shared";
import { useThreads } from "../hooks";

export function CategoryChip({ category }: { category: string }) {
  const cls =
    category === "Help"
      ? "text-sev-high border-sev-high/30 bg-sev-high/10"
      : category === "Issue-linked"
        ? "text-sev-low border-sev-low/30 bg-sev-low/10"
        : "text-primary border-primary/30 bg-primary/10";
  return <Chip className={cls}>{category}</Chip>;
}

export function ThreadList({ issueId }: { issueId: number | null }) {
  const { data, isLoading } = useThreads(issueId);
  const issue = useQuery({
    queryKey: ["issues", "one", issueId],
    enabled: !!issueId,
    queryFn: async () => {
      const { data, error } = await supabase.from("issues").select("id, title").eq("id", issueId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const startThread = () =>
    emit("ftl:new-thread", issueId ? { issueId, category: "Issue-linked" } : undefined);

  return (
    <div className="mx-auto w-full max-w-[var(--content-max)] px-4 py-6 md:px-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Brainstorm</h1>
        <div className="flex rounded-md border border-border p-0.5 text-xs">
          <span className="rounded bg-secondary px-2.5 py-1 font-medium">New</span>
        </div>
        <Button className="ml-auto hidden md:inline-flex" onClick={startThread}>
          <Plus className="mr-1 h-4 w-4" /> New Thread
          <kbd className="ml-2 rounded border border-primary-foreground/30 px-1 font-mono text-[10px]">T</kbd>
        </Button>
      </div>

      {issueId && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <Link to="/issues" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Issues
          </Link>
          <span>
            Discussions linked to <span className="font-mono">Issue #{issueId}</span>
            {issue.data ? <> — <span className="font-medium">{issue.data.title}</span></> : null}
          </span>
          <Link to="/brainstorm" search={{}} className="ml-auto text-xs text-primary hover:underline">Show all</Link>
        </div>
      )}

      {isLoading ? (
        <CardSkeletonList count={5} />
      ) : !data?.length ? (
        <EmptyState
          icon={<Lightbulb className="h-6 w-6" />}
          title={issueId ? "No discussion yet for this issue" : "No threads yet"}
          description={issueId ? "Kick things off — share a theory, a fix idea, or a question." : "Start the first conversation for the team."}
          action={<Button size="sm" onClick={startThread}>Start a thread</Button>}
        />
      ) : (
        <div className="space-y-3">
          {data.map((t) => (
            <Link
              key={t.id}
              to="/brainstorm/t/$id"
              params={{ id: t.id }}
              className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-subtle-foreground/50"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold">{t.title}</h3>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{t.body}</p>
                </div>
                <div className="hidden shrink-0 gap-1.5 sm:flex">
                  <CategoryChip category={t.category} />
                  {t.issue_id && <Chip className="font-mono">🔗 Issue #{t.issue_id}</Chip>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-subtle-foreground">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <UserAvatar name={t.author_name} url={t.author_avatar_url} size={20} />
                  {t.author_name || "Unknown"}
                </span>
                <RelativeTime date={t.created_at} />
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> {t.reply_count} {Number(t.reply_count) === 1 ? "reply" : "replies"}
                </span>
                <span className="flex gap-1.5 sm:hidden">
                  <CategoryChip category={t.category} />
                  {t.issue_id && <Chip className="font-mono">🔗 #{t.issue_id}</Chip>}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
