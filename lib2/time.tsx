import { useEffect, useState } from "react";

/** Ticks every 30s so relative timestamps stay live. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function relativeTime(date: string | Date, now: number = Date.now()) {
  const diff = Math.max(0, now - new Date(date).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function RelativeTime({ date, className }: { date: string; className?: string }) {
  const now = useNow();
  return (
    <time dateTime={date} title={new Date(date).toLocaleString()} className={className} suppressHydrationWarning>
      {relativeTime(date, now)}
    </time>
  );
}
