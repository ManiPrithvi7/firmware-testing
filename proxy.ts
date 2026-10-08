import { NextResponse, type NextRequest } from "next/server";

// Global gate (Next 16 proxy file, formerly middleware): no Auth.js session
// cookie → redirect to /login?next=<original path>.
// UX gating only — every /api route handler re-checks auth() and returns 401.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(req: NextRequest) {
    const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
    if (!hasSession) {
        const url = new URL("/login", req.url);
        url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
        return NextResponse.redirect(url);
    }
    return NextResponse.next();
}

export const config = {
    // /api/* is excluded: route handlers do their own auth() and must return
    // 401 JSON, not a redirect. /login, /api/auth, _next assets, favicon are public.
    matcher: ["/((?!login|api|_next|favicon.ico).*)"],
};
