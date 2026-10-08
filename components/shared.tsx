import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function UserAvatar({ name, url, size = 28, className }: { name?: string | null | undefined; url?: string | null | undefined; size?: number; className?: string | undefined }) {
  const initials = (name ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[11px] font-medium text-muted-foreground", className)}
      style={{ width: size, height: size }}
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initials || "?"}
    </span>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground", className)}>
      {children}
    </span>
  );
}

const sevClass: Record<string, string> = {
  Critical: "text-sev-critical border-sev-critical/30 bg-sev-critical/10",
  High: "text-sev-high border-sev-high/30 bg-sev-high/10",
  Medium: "text-sev-medium border-sev-medium/30 bg-sev-medium/10",
  Low: "text-sev-low border-sev-low/30 bg-sev-low/10",
};
export function SeverityChip({ severity }: { severity: string }) {
  return <Chip className={sevClass[severity]}>{severity}</Chip>;
}

const statusDot: Record<string, string> = {
  Open: "bg-status-open",
  "In progress": "bg-status-progress",
  Blocked: "bg-status-blocked",
  Done: "bg-status-done",
};
export function StatusIndicator({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", statusDot[status] ?? "bg-subtle-foreground")} />
      {status}
    </span>
  );
}

export function CardSkeletonList({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="mt-3 h-3 w-4/5" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-14 text-center">
      {icon && <div className="mb-3 text-subtle-foreground">{icon}</div>}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} aria-hidden>
      <path fill="currentColor" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.3 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
