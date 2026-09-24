"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addTodo,
  createIssue,
  deleteIssue,
  deleteProof,
  updateIssuePriority,
  updateIssueStatus,
  uploadIssueProof,
} from "@/app/action";
import { PRIORITIES, STATUSES, labelFor } from "@/lib/constants";
import type { IssueRow } from "@/lib/db";

const DEVICE_KEY = "hwtracker_device";
const SEVERITY_ORDER = ["critical", "high", "medium", "low"] as const;

export function Board({
  issues,
  storageReady,
}: {
  issues: IssueRow[];
  storageReady: boolean;
}) {
  const [deviceName, setDeviceName] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [draftFiles, setDraftFiles] = useState<File[]>([]);

  useEffect(() => {
    setDeviceName(localStorage.getItem(DEVICE_KEY) ?? "");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setLightbox(null);
      setOpenNew(false);
      setDetailId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const numberById = useMemo(() => {
    const ordered = [...issues].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return new Map(ordered.map((issue, index) => [issue.id, index + 1]));
  }, [issues]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...issues]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter((issue) => {
        if (filterStatus && issue.status !== filterStatus) return false;
        if (filterSeverity && issue.priority !== filterSeverity) return false;
        if (!term) return true;
        const hay = `${issue.title} ${issue.description}`.toLowerCase();
        return hay.includes(term);
      });
  }, [issues, filterStatus, filterSeverity, search]);

  const selected = issues.find((issue) => issue.id === detailId) ?? null;

  function notify(message: string) {
    setToast(message);
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) notify(result.error ?? "Couldn't save that change.");
      else if (success) notify(success);
    });
  }

  return (
    <div className="hw-log">
      <header className="bench">
        <div className="bench-title">
          <h1>Firmware Test Log</h1>
          <div className="sub">
            <input
              type="text"
              value={deviceName}
              placeholder="Device / batch under test (e.g. PROOF Display rev C)"
              onChange={(event) => {
                setDeviceName(event.target.value);
                localStorage.setItem(DEVICE_KEY, event.target.value);
              }}
            />
          </div>
        </div>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setDraftFiles([]);
            setOpenNew(true);
          }}
        >
          + Log issue
        </button>
      </header>

      {storageReady ? null : (
        <div className="banner">
          Photo upload is off until storage credentials are set. Issues and notes still save.
        </div>
      )}

      <div className="controls">
        <div className="pill-row">
          <button
            className="pill"
            type="button"
            aria-pressed={filterStatus === ""}
            onClick={() => setFilterStatus("")}
          >
            All
          </button>
          {STATUSES.map((status) => (
            <button
              key={status.value}
              className="pill"
              type="button"
              aria-pressed={filterStatus === status.value}
              onClick={() => setFilterStatus(status.value)}
            >
              {status.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Severity"
          value={filterSeverity}
          onChange={(event) => setFilterSeverity(event.target.value)}
        >
          <option value="">All severities</option>
          {SEVERITY_ORDER.map((value) => (
            <option key={value} value={value}>
              {labelFor(PRIORITIES, value)}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <input
          type="search"
          value={search}
          placeholder="Search issues…"
          style={{ width: 180 }}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {issues.length === 0 ? (
        <div className="log-empty">
          <strong>No issues logged yet</strong>
          Log the first one you find on the bench — photos help the firmware team a lot.
        </div>
      ) : visible.length === 0 ? (
        <div className="log-empty">
          <strong>Nothing matches these filters</strong>
          Try clearing the status, severity, or search filter.
        </div>
      ) : (
        <ul className="log">
          {visible.map((issue) => {
            const thumb = issue.proofs.find((proof) => proof.url);
            return (
              <li key={issue.id}>
                <button
                  className="row"
                  type="button"
                  onClick={() => setDetailId(issue.id)}
                >
                  <div className="sev-bar" data-sev={issue.priority} />
                  <div className="row-num">#{numberById.get(issue.id)}</div>
                  <div className="row-main">
                    <div className="row-title">
                      {thumb?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="row-thumb" src={thumb.url} alt="" />
                      ) : null}
                      {issue.title || "(untitled)"}
                    </div>
                    <div className="row-meta">
                      {labelFor(PRIORITIES, issue.priority)} · reported {timeAgo(issue.created_at)}
                    </div>
                  </div>
                  <span className="badge" data-status={issue.status}>
                    {labelFor(STATUSES, issue.status)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {openNew ? (
        <div
          className="overlay"
          onClick={() => setOpenNew(false)}
        >
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="close-x" type="button" onClick={() => setOpenNew(false)} aria-label="Close">
              ×
            </button>
            <h2>Log a new issue</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                const title = String(data.get("title") ?? "").trim();
                if (!title) {
                  notify("Give the issue a short title first.");
                  return;
                }
                for (const file of draftFiles) data.append("proof", file);
                run(async () => {
                  const result = await createIssue(data);
                  if (result.ok) {
                    form.reset();
                    setDraftFiles([]);
                    setOpenNew(false);
                    notify("Issue logged.");
                  }
                  return result;
                });
              }}
            >
              <div className="field">
                <label htmlFor="f-title">Title</label>
                <input id="f-title" name="title" type="text" placeholder='Short summary, e.g. "Display flickers on cold boot"' autoFocus />
              </div>
              <div className="field">
                <label htmlFor="f-severity">Severity</label>
                <select id="f-severity" name="priority" defaultValue="medium">
                  {SEVERITY_ORDER.map((value) => (
                    <option key={value} value={value}>
                      {labelFor(PRIORITIES, value)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="f-desc">What happened</label>
                <textarea id="f-desc" name="description" rows={3} placeholder="Describe the issue and the expected behaviour" />
              </div>
              <div className="field">
                <label htmlFor="f-steps">Steps to reproduce</label>
                <textarea id="f-steps" name="steps" rows={3} placeholder={"1. Power on\n2. ..."} />
              </div>
              {storageReady ? (
                <div className="field">
                  <label htmlFor="f-images">Photos</label>
                  <input
                    id="f-images"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={(event) => {
                      const next = Array.from(event.target.files ?? []);
                      setDraftFiles((current) => [...current, ...next]);
                      event.target.value = "";
                    }}
                  />
                  <div className="thumbs">
                    {draftFiles.map((file, index) => (
                      <Thumb
                        key={`${file.name}-${file.lastModified}-${index}`}
                        file={file}
                        onRemove={() => setDraftFiles((current) => current.filter((_, i) => i !== index))}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="modal-actions">
                <button className="btn secondary" type="button" onClick={() => setOpenNew(false)}>
                  Cancel
                </button>
                <button className="btn" type="submit" disabled={pending}>
                  {pending ? "Logging…" : "Log issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="overlay" onClick={() => setDetailId(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="close-x" type="button" onClick={() => setDetailId(null)} aria-label="Close">
              ×
            </button>
            <div className="detail-num">#{numberById.get(selected.id)}</div>
            <h2>{selected.title || "(untitled)"}</h2>
            {selected.proofs.length > 0 ? (
              <div className="detail-imgs">
                {selected.proofs.map((proof) =>
                  proof.url ? (
                    <button key={proof.id} type="button" onClick={() => setLightbox(proof.url)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proof.url} alt={proof.filename} />
                    </button>
                  ) : null,
                )}
              </div>
            ) : null}
            <div className="detail-meta-row">
              <div className="field">
                <label htmlFor="d-status">Status</label>
                <select
                  id="d-status"
                  value={selected.status}
                  disabled={pending}
                  onChange={(event) => run(() => updateIssueStatus(selected.id, event.target.value))}
                >
                  {STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="d-severity">Severity</label>
                <select
                  id="d-severity"
                  value={selected.priority}
                  disabled={pending}
                  onChange={(event) => run(() => updateIssuePriority(selected.id, event.target.value))}
                >
                  {SEVERITY_ORDER.map((value) => (
                    <option key={value} value={value}>
                      {labelFor(PRIORITIES, value)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selected.description ? (
              <div className="detail-block">
                <h4>What happened</h4>
                <p>{selected.description}</p>
              </div>
            ) : null}
            {selected.steps ? (
              <div className="detail-block">
                <h4>Steps to reproduce</h4>
                <p>{selected.steps}</p>
              </div>
            ) : null}
            <div className="detail-block">
              <h4>Reported</h4>
              <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
                {new Date(selected.created_at).toLocaleString()}
              </p>
            </div>
            <div className="detail-block">
              <h4>Comments</h4>
              <div className="comments">
                {selected.todos.length === 0 ? (
                  <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No comments yet.</div>
                ) : (
                  selected.todos.map((todo) => (
                    <div key={todo.id} className="comment">
                      <div className="who">{timeAgo(todo.created_at)}</div>
                      <div className="text">{todo.title}</div>
                    </div>
                  ))
                )}
              </div>
              <form
                className="comment-add"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  data.set("issueId", selected.id);
                  const text = String(data.get("title") ?? "").trim();
                  if (!text) return;
                  run(async () => {
                    const result = await addTodo(data);
                    if (result.ok) form.reset();
                    return result;
                  });
                }}
              >
                <textarea name="title" placeholder="Add a note for the team…" />
                <button className="btn secondary" type="submit" disabled={pending}>
                  Post
                </button>
              </form>
            </div>
            {storageReady ? (
              <div className="field">
                <label htmlFor="d-photos">Add photos</label>
                <input
                  id="d-photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  disabled={pending}
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = "";
                    if (files.length === 0) return;
                    run(async () => {
                      for (const file of files) {
                        const data = new FormData();
                        data.set("issueId", selected.id);
                        data.set("proof", file);
                        const result = await uploadIssueProof(data);
                        if (!result.ok) return result;
                      }
                      return { ok: true };
                    }, files.length === 1 ? "Photo added." : "Photos added.");
                  }}
                />
              </div>
            ) : null}
            {selected.proofs.length > 0 ? (
              <div className="thumbs">
                {selected.proofs.map((proof) => (
                  <div key={proof.id} className="thumb-wrap">
                    {proof.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={proof.url} alt={proof.filename} />
                    ) : (
                      <span>{proof.filename}</span>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${proof.filename}`}
                      disabled={pending}
                      onClick={() => run(() => deleteProof(proof.id))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="modal-actions">
              <button
                className="btn ghost"
                type="button"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const result = await deleteIssue(selected.id);
                    if (result.ok) setDetailId(null);
                    return result;
                  }, "Issue deleted.")
                }
              >
                Delete issue
              </button>
              <button className="btn secondary" type="button" onClick={() => setDetailId(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lightbox ? (
        <button className="lightbox" type="button" onClick={() => setLightbox(null)} aria-label="Close photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" />
        </button>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function Thumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  if (!url) return null;
  return (
    <div className="thumb-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" />
      <button type="button" onClick={onRemove} aria-label="Remove photo">
        ×
      </button>
    </div>
  );
}

function timeAgo(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
