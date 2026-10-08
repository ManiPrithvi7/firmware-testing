"use client";

import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { NotesList } from "@/features/notes";

export default function NotesLayout({ children }: { children: React.ReactNode }) {
    const params = useParams() as { id?: string };
    const id = params.id;
    return (
        <div className="flex h-[calc(100vh-7rem)] md:h-screen">
            <div className={cn("w-full border-r border-border lg:block lg:w-[360px] lg:shrink-0", id && "hidden")}>
                <NotesList activeId={id} />
            </div>
            <div className={cn("min-w-0 flex-1", !id && "hidden lg:block")}>
                {children}
            </div>
        </div>
    );
}
