// Tiny app-wide event bus so the shell (FAB, shortcuts) can trigger feature actions
// without features importing each other.
export type NewThreadPreset = { title?: string; body?: string; category?: string; issueId?: number | null };

type EventMap = {
  "ftl:log-issue": undefined;
  "ftl:new-note": undefined;
  "ftl:new-thread": NewThreadPreset | undefined;
};

export function emit<K extends keyof EventMap>(name: K, detail?: EventMap[K]) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on<K extends keyof EventMap>(name: K, handler: (detail: EventMap[K]) => void) {
  const fn = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener(name, fn);
  return () => window.removeEventListener(name, fn);
}

export function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}
