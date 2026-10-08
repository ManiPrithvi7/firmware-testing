"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bug, NotebookPen, Lightbulb, PanelLeftClose, PanelLeftOpen, Plus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { emit, isTypingTarget } from "@/lib/events";
import { UserAvatar, GoogleIcon } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewThreadDialogHost } from "@/features/brainstorm";
import { useCreateNote } from "@/features/notes";

const COLLAPSE_KEY = "ftl:sidebar-collapsed";

type NavItem = { to: "/issues" | "/notes" | "/brainstorm"; label: string; icon: typeof Bug };
const NAV: NavItem[] = [
    { to: "/issues", label: "Issues", icon: Bug },
    { to: "/notes", label: "Notes", icon: NotebookPen },
    { to: "/brainstorm", label: "Brainstorm", icon: Lightbulb },
];

function useSection() {
    const pathname = usePathname();
    if (pathname.startsWith("/notes")) return "/notes";
    if (pathname.startsWith("/brainstorm")) return "/brainstorm";
    return "/issues";
}

export function AppShell({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const auth = useAuth();
    const section = useSection();
    const createNote = useCreateNote();

    useEffect(() => {
        setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    }, []);
    const toggle = () => {
        setCollapsed((c) => {
            localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
            return !c;
        });
    };

    // Global shortcuts: N = new note, T = new thread
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
            if (document.querySelector("[role=dialog]")) return;
            const k = e.key.toLowerCase();
            if (k !== "n" && k !== "t") return;
            if (!auth.user) return;
            e.preventDefault();
            if (k === "n") createNote.mutate();
            else emit("ftl:new-thread");
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [auth.user, createNote]);

    const onFab = () => {
        if (section === "/issues") return emit("ftl:log-issue");
        if (!auth.user) return;
        if (section === "/notes") createNote.mutate();
        else emit("ftl:new-thread");
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <aside
                className={cn(
                    "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
                    collapsed ? "w-16" : "w-[248px]",
                )}
            >
                <div className={cn("flex h-14 items-center gap-2.5 px-4", collapsed && "justify-center px-0")}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-xs font-bold text-primary-foreground">FTL</span>
                    {!collapsed && (
                        <div className="min-w-0 leading-tight">
                            <div className="text-sm font-semibold">FTL</div>
                            <div className="truncate text-[11px] text-subtle-foreground">Firmware Test Log</div>
                        </div>
                    )}
                </div>
                <nav className="flex-1 space-y-1 px-2 pt-2">
                    {NAV.map((item) => (
                        <SidebarLink key={item.to} item={item} collapsed={collapsed} active={section === item.to} />
                    ))}
                </nav>
                <div className="space-y-2 border-t border-sidebar-border p-2">
                    <AccountArea collapsed={collapsed} />
                    <button
                        onClick={toggle}
                        className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-subtle-foreground hover:bg-sidebar-accent hover:text-foreground", collapsed && "justify-center")}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
                    </button>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
                <MobileHeader />
                <main className="flex-1">{children}</main>
            </div>

            <MobileTabBar section={section} />
            <button
                onClick={onFab}
                aria-label="Create"
                className={cn(
                    "fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 md:hidden",
                    section !== "/issues" && !auth.user && "hidden",
                )}
            >
                <Plus className="h-6 w-6" />
            </button>

            {auth.user && <NewThreadDialogHost />}
        </div>
    );
}

function SidebarLink({ item, collapsed, active }: { item: NavItem; collapsed: boolean; active: boolean }) {
    const Icon = item.icon;
    return (
        <Link
            href={item.to}
            title={item.label}
            className={cn(
                "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            )}
        >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
        </Link>
    );
}

function AccountArea({ collapsed }: { collapsed: boolean }) {
    const auth = useAuth();
    if (auth.loading) return <div className="h-10" />;
    if (!auth.user) {
        // Unreachable behind the proxy gate; kept as a graceful fallback.
        return (
            <Button variant="outline" className={cn("w-full justify-center gap-2", collapsed && "px-0")} onClick={() => auth.signInWithGoogle()}>
                <GoogleIcon />
                {!collapsed && "Sign in with Google"}
            </Button>
        );
    }
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className={cn("flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-sidebar-accent", collapsed && "justify-center")}>
                <UserAvatar name={auth.displayName} url={auth.avatarUrl} size={30} />
                {!collapsed && (
                    <div className="min-w-0 flex-1 leading-tight">
                        <div className="truncate text-sm font-medium">{auth.displayName}</div>
                        <div className="truncate text-[11px] text-subtle-foreground">{auth.user.email}</div>
                    </div>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                    <div className="text-sm">{auth.displayName}</div>
                    <div className="text-xs text-muted-foreground">{auth.user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => auth.signOut()}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function MobileHeader() {
    return (
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:hidden">
            <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary font-mono text-[10px] font-bold text-primary-foreground">FTL</span>
                <span className="text-sm font-semibold">Firmware Test Log</span>
            </div>
            <AccountArea collapsed />
        </header>
    );
}

function MobileTabBar({ section }: { section: string }) {
    const router = useRouter();
    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-border bg-background/95 backdrop-blur md:hidden">
            {NAV.map((item) => {
                const Icon = item.icon;
                return (
                    <button
                        key={item.to}
                        onClick={() => router.push(item.to)}
                        className={cn(
                            "flex flex-1 flex-col items-center justify-center gap-1 text-[11px]",
                            section === item.to ? "text-primary" : "text-muted-foreground",
                        )}
                    >
                        <Icon className="h-5 w-5" />
                        {item.label}
                    </button>
                );
            })}
        </nav>
    );
}
