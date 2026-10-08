"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/shared";

function LoginCard() {
    const searchParams = useSearchParams();
    const next = searchParams.get("next");
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/issues";

    return (
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground">
                FTL
            </span>
            <h1 className="mt-4 text-lg font-semibold">Firmware Test Log</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Sign in with your Google account.
            </p>
            <Button className="mt-6 w-full gap-2" onClick={() => signIn("google", { redirectTo: target })}>
                <GoogleIcon /> Continue with Google
            </Button>
        </div>
    );
}

export default function LoginPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
            <Suspense>
                <LoginCard />
            </Suspense>
        </main>
    );
}
