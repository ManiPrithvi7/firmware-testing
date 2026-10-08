import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { RelativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeletonList, Chip, EmptyState, UserAvatar } from "@/components/shared";
import { useAddComment, useComments, type CommentWithAuthor, type ThreadWithAuthor } from "../hooks";
import { CategoryChip } from "./ThreadList";

const PAGE = 20;
const MAX_INDENT = 3;

export function ThreadViewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[var(--content-max)] px-4 py-6 md:px-8">
      <div className="rounded-lg border border-border bg-card p-5">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-4/5" />
      </div>
      <CardSkeletonList count={3} className="mt-6" />
    </div>
  );
}

export function ThreadView({ thread }: { thread: ThreadWithAuthor }) {
  const [limit, setLimit] = useState(PAGE);
  const { data, isLoading, isFetching } = useComments(thread.id, limit);

  const tree = useMemo(() => {
    const byParent = new Map<string | null, CommentWithAuthor[]>();
    const byId = new Map<string, CommentWithAuthor>();
    for (const c of data?.comments ?? []) {
      byId.set(c.id, c);
      const key = c.parent_id && byIdHas(data!.comments, c.parent_id) ? c.parent_id : null;
      byParent.set(key, [...(byParent.get(key) ?? []), c]);
    }
    return { byParent, byId };
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-[var(--content-max)] px-4 py-6 pb-40 md:px-8 md:pb-10">
      <Link to="/brainstorm" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Brainstorm
      </Link>

      <article className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-subtle-foreground">
          <UserAvatar name={thread.author?.name} url={thread.author?.avatar_url} size={28} />
          <span className="text-sm font-medium text-foreground">{thread.author?.name || "Unknown"}</span>
          <RelativeTime date={thread.created_at} />
          <span className="ml-auto flex gap-1.5">
            <CategoryChip category={thread.category} />
            {thread.issue_id && (
              <Link to="/brainstorm" search={{ issue: thread.issue_id }}>
                <Chip className="font-mono hover:text-foreground">🔗 Issue #{thread.issue_id}</Chip>
              </Link>
            )}
          </span>
        </div>
        <h1 className="mt-4 text-xl font-semibold">{thread.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{thread.body}</p>
      </article>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 p-3 backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
        <Composer threadId={thread.id} placeholder="Share your thoughts…" />
      </div>

      <h2 className="mb-3 mt-8 flex items-center gap-2 text-sm font-semibold">
        <MessageSquare className="h-4 w-4" /> {data?.total ?? 0} {data?.total === 1 ? "reply" : "replies"}
      </h2>

      {isLoading ? (
        <CardSkeletonList count={3} />
      ) : !data?.comments.length ? (
        <EmptyState title="No replies yet" description="Be the first to weigh in." />
      ) : (
        <div className="space-y-3">
          {(tree.byParent.get(null) ?? []).map((c) => (
            <CommentNode key={c.id} comment={c} depth={0} tree={tree} threadId={thread.id} />
          ))}
        </div>
      )}

      {data && data.comments.length < data.total && (
        <div className="mt-5 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE)} disabled={isFetching}>
            {isFetching ? "Loading…" : `Load more (${data.total - data.comments.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}

function byIdHas(list: CommentWithAuthor[], id: string) {
  return list.some((c) => c.id === id);
}

type Tree = { byParent: Map<string | null, CommentWithAuthor[]>; byId: Map<string, CommentWithAuthor> };

/** Collect all descendants (flattened) for comments past the max indent depth. */
function flatten(id: string, tree: Tree): CommentWithAuthor[] {
  const out: CommentWithAuthor[] = [];
  for (const c of tree.byParent.get(id) ?? []) out.push(c, ...flatten(c.id, tree));
  return out.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function CommentNode({ comment, depth, tree, threadId, mention }: { comment: CommentWithAuthor; depth: number; tree: Tree; threadId: string; mention?: string | null }) {
  const [replying, setReplying] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const atLimit = depth >= MAX_INDENT;
  const children = atLimit ? [] : (tree.byParent.get(comment.id) ?? []);
  const flatKids = depth === MAX_INDENT - 1 ? children.flatMap((c) => [c]) : null;
  const replyCount = children.length;

  return (
    <div>
      <div className={cn(depth === 0 && "rounded-lg border border-border bg-card p-4", depth > 0 && "py-2")}>
        <div className="flex items-center gap-2 text-xs text-subtle-foreground">
          <UserAvatar name={comment.author?.name} url={comment.author?.avatar_url} size={22} />
          <span className="text-[13px] font-medium text-foreground">{comment.author?.name || "Unknown"}</span>
          <RelativeTime date={comment.created_at} />
        </div>
        <p className="mt-1.5 whitespace-pre-wrap pl-[30px] text-sm leading-relaxed">
          {mention && <span className="mr-1 font-medium text-primary">@{mention}</span>}
          {comment.body}
        </p>
        <div className="mt-1 flex items-center gap-3 pl-[30px] text-xs text-subtle-foreground">
          <button className="hover:text-foreground" onClick={() => setReplying((r) => !r)}>Reply</button>
          {replyCount > 0 && (
            <button className="flex items-center gap-0.5 hover:text-foreground" onClick={() => setCollapsed((c) => !c)}>
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
        {replying && (
          <div className="mt-2 pl-[30px]">
            <Composer threadId={threadId} parentId={comment.id} placeholder={`Reply to ${comment.author?.name ?? "comment"}…`} onDone={() => setReplying(false)} autoFocus />
          </div>
        )}
        {!collapsed && children.length > 0 && (
          <div className="ml-[11px] mt-2 border-l border-border pl-4">
            {(flatKids ?? children).map((c) => (
              <div key={c.id}>
                <CommentNode comment={c} depth={depth + 1} tree={tree} threadId={threadId} />
                {depth + 1 === MAX_INDENT - 0 ? null : null}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Level 4+: render all deeper descendants flat at the deepest indent, with @mention */}
      {atLimit && !collapsed && <DeepReplies id={comment.id} tree={tree} threadId={threadId} />}
    </div>
  );
}

function DeepReplies({ id, tree, threadId }: { id: string; tree: Tree; threadId: string }) {
  const deep = flatten(id, tree);
  if (!deep.length) return null;
  return (
    <div>
      {deep.map((c) => (
        <CommentNode
          key={c.id}
          comment={c}
          depth={MAX_INDENT + 1}
          tree={{ ...tree, byParent: new Map() }}
          threadId={threadId}
          mention={c.parent_id ? tree.byId.get(c.parent_id)?.author?.name ?? null : null}
        />
      ))}
    </div>
  );
}

function Composer({ threadId, parentId, placeholder, onDone, autoFocus }: { threadId: string; parentId?: string; placeholder: string; onDone?: () => void; autoFocus?: boolean }) {
  const { displayName, avatarUrl } = useAuth();
  const [body, setBody] = useState("");
  const add = useAddComment(threadId);
  const submit = () => {
    if (!body.trim()) return;
    add.mutate({ body: body.trim(), parentId }, { onSuccess: () => { setBody(""); onDone?.(); } });
  };
  return (
    <div className="flex items-start gap-2.5">
      {!parentId && <UserAvatar name={displayName} url={avatarUrl} size={30} className="hidden sm:inline-flex" />}
      <div className="flex-1">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          rows={parentId ? 2 : 3}
          autoFocus={autoFocus}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          className="min-h-0 resize-none bg-card"
        />
        <div className="mt-2 flex justify-end gap-2">
          {onDone && <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>}
          <Button size="sm" onClick={submit} disabled={!body.trim() || add.isPending}>
            {add.isPending ? "Posting…" : parentId ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
