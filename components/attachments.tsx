"use client";

import { useRef, useState } from "react";
import { FileVideo, Loader2, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isVideoType, PROOF_ACCEPT } from "@/lib/constants";
import type { Attachment } from "@/lib/types";
import { Button } from "@/components/ui/button";

/** Paperclip button + hidden file input (photos/videos, same accept list as issue proofs). */
export function AttachmentPicker({
    onPick,
    disabled,
    className,
}: {
    onPick: (files: File[]) => void;
    disabled?: boolean;
    className?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <>
            <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn("h-8 w-8 text-muted-foreground", className)}
                aria-label="Attach a photo or video"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
            >
                <Paperclip className="h-4 w-4" />
            </Button>
            <input
                ref={inputRef}
                type="file"
                accept={PROOF_ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length > 0) onPick(files);
                    e.target.value = "";
                }}
            />
        </>
    );
}

/** Chips for files chosen in a composer but not uploaded yet (parent doesn't exist yet). */
export function PendingFileChips({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
    if (files.length === 0) return null;
    return (
        <div className="mt-2 flex flex-wrap gap-1.5">
            {files.map((f, i) => (
                <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 text-[11px] text-muted-foreground"
                >
                    {isVideoType(f.type) ? <FileVideo className="h-3 w-3" /> : null}
                    <span className="max-w-[160px] truncate">{f.name}</span>
                    <button type="button" aria-label={`Remove ${f.name}`} className="hover:text-foreground" onClick={() => onRemove(i)}>
                        <X className="h-3 w-3" />
                    </button>
                </span>
            ))}
        </div>
    );
}

/** Read-only strip of uploaded attachments; images render as thumbnails, videos as links. */
export function AttachmentStrip({
    attachments,
    onDelete,
    deleting,
}: {
    attachments: Attachment[] | undefined;
    onDelete?: (id: string) => void;
    deleting?: boolean;
}) {
    if (!attachments || attachments.length === 0) return null;
    return (
        <div className="mt-3 flex flex-wrap gap-2">
            {attachments.map((a) => (
                <span key={a.id} className="group relative inline-flex">
                    {a.url && !isVideoType(a.content_type) ? (
                        <a href={a.url} target="_blank" rel="noreferrer" title={a.filename}>
                            <img
                                src={a.url}
                                alt={a.filename}
                                className="h-60 w-60 rounded-md border border-border object-cover"
                                referrerPolicy="no-referrer"
                            />
                        </a>
                    ) : (
                        <a
                            href={a.url ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            title={a.filename}
                            className="inline-flex h-40 w-40 flex-col items-center justify-center gap-1.5 rounded-md border border-border bg-secondary/50 p-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <FileVideo className="h-8 w-8" />
                            <span className="w-full truncate text-center">{a.filename}</span>
                        </a>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            aria-label={`Delete ${a.filename}`}
                            disabled={deleting}
                            onClick={() => onDelete(a.id)}
                            className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-destructive group-hover:inline-flex"
                        >
                            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                        </button>
                    )}
                </span>
            ))}
        </div>
    );
}

/** Busy state while files upload after a composer submits. */
export function UploadingNote({ active }: { active: boolean }) {
    if (!active) return null;
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-subtle-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Uploading attachments…
        </span>
    );
}
