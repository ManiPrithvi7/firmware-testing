import type { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            /** Neon profiles.id — server-side ownership scoping key. */
            profileId?: string;
        } & DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        profileId?: string;
    }
}
