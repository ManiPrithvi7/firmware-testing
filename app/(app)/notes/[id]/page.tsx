"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { NoteEditor, NoteEditorSkeleton, useNote } from "@/features/notes";

export default function NotePage() {
    const params = useParams() as { id: string };
    const { data, isLoading } = useNote(params.id);
    if (isLoading) return <NoteEditorSkeleton />;
    // Identical generic 404 whether the note doesn't exist or belongs to someone else.
    if (!data) return <NotFound />;
    return <NoteEditor key={data.id} note={data} />;
}

export function NotFound() {
    return (
        <div className="flex h-full min-h-[50vh] flex-col items-center justify-center text-center">
            <h1 className="text-5xl font-bold">404</h1>
            <p className="mt-2 text-sm text-muted-foreground">This page doesn&apos;t exist.</p>
            <Link href="/issues" className="mt-4 text-sm text-primary hover:underline">Go home</Link>
        </div>
    );
}
