"use client";

// Client auth context over Auth.js (next-auth/react). Replaces the clone's
// Supabase auth context. The whole app sits behind the proxy gate, so there is
// no requireSignIn modal — signed-out users never reach the shell.
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

export type AuthUser = {
    /** Neon profiles.id — used for query keys; the server re-derives it from the session. */
    id: string;
    email: string | null;
};

type AuthCtx = {
    user: AuthUser | null;
    loading: boolean;
    displayName: string;
    avatarUrl: string | null;
    signInWithGoogle: (redirectTo?: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const queryClient = useQueryClient();
    const loading = status === "loading";

    const signInWithGoogle = useCallback(async (redirectTo?: string) => {
        const target =
            redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
                ? redirectTo
                : window.location.pathname + window.location.search;
        await signIn("google", { redirectTo: target });
    }, []);

    const handleSignOut = useCallback(async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await signOut({ redirectTo: "/login" });
    }, [queryClient]);

    const value = useMemo<AuthCtx>(() => {
        const u = session?.user;
        const user: AuthUser | null = u?.profileId ? { id: u.profileId, email: u.email ?? null } : null;
        return {
            user,
            loading,
            displayName: u?.name ?? u?.email?.split("@")[0] ?? "",
            avatarUrl: u?.image ?? null,
            signInWithGoogle,
            signOut: handleSignOut,
        };
    }, [session, loading, signInWithGoogle, handleSignOut]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
