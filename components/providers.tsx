"use client";

import { useState, type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());
    return (
        <SessionProvider>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    {children}
                    <Toaster theme="dark" />
                </AuthProvider>
            </QueryClientProvider>
        </SessionProvider>
    );
}
