"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ThreadView, ThreadViewSkeleton, useThread } from "@/features/brainstorm";

export default function ThreadPage() {
    const params = useParams() as { id: string };
    const { data, isLoading } = useThread(params.id);
    if (isLoading) return <ThreadViewSkeleton />;
    if (!data)
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <h1 className="text-5xl font-bold">404</h1>
                <p className="mt-2 text-sm text-muted-foreground">This page doesn&apos;t exist.</p>
                <Link href="/brainstorm" className="mt-4 text-sm text-primary hover:underline">Back to Brainstorm</Link>
            </div>
        );
    return <ThreadView thread={data} />;
}
