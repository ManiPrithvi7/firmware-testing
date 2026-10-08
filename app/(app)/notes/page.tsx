import { NotebookPen } from "lucide-react";

export default function NotesIndexPage() {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <NotebookPen className="h-6 w-6 text-subtle-foreground" />
            Select a note, or press <kbd className="rounded border border-border px-1.5 font-mono text-xs">N</kbd> to create one.
        </div>
    );
}
