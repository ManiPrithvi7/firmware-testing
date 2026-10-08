import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase, lovable } from "@/lib/supabase";

const PENDING_KEY = "ftl:pending-redirect";

type SignInPrompt = { message: string; redirectTo?: string | undefined } | null;

type AuthCtx = {
  user: User | null;
  loading: boolean;
  displayName: string;
  avatarUrl: string | null;
  prompt: SignInPrompt;
  requireSignIn: (message: string, redirectTo?: string) => void;
  closePrompt: () => void;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function safePath(p: string | null | undefined) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<SignInPrompt>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      if (event === "SIGNED_IN") {
        setPrompt(null);
        const pending = safePath(sessionStorage.getItem(PENDING_KEY));
        if (pending) {
          sessionStorage.removeItem(PENDING_KEY);
          router.navigate({ to: pending });
        }
      }
    });
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const target = safePath(redirectTo);
    if (target) sessionStorage.setItem(PENDING_KEY, target);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Sign-in failed", { description: result.error.message });
    }
  }, []);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/issues", replace: true });
  }, [queryClient, router]);

  const value = useMemo<AuthCtx>(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
    return {
      user,
      loading,
      displayName: meta['name'] ?? meta['full_name'] ?? user?.email?.split("@")[0] ?? "",
      avatarUrl: meta['avatar_url'] ?? meta['picture'] ?? null,
      prompt,
      requireSignIn: (message, redirectTo) => setPrompt({ message, redirectTo }),
      closePrompt: () => setPrompt(null),
      signInWithGoogle,
      signOut,
    };
  }, [user, loading, prompt, signInWithGoogle, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
