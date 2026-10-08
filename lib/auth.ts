import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db, ensureSchema } from "@/lib/db";

type ProfileRow = {
    id: string;
    name: string | null;
    avatar_url: string | null;
};

async function upsertProfile(input: {
    email: string;
    name: string | null;
    image: string | null;
    sub: string | null;
}): Promise<ProfileRow> {
    await ensureSchema();
    const sql = db();
    const rows = await sql`
    INSERT INTO profiles (email, name, avatar_url, google_sub)
    VALUES (${input.email}, ${input.name}, ${input.image}, ${input.sub})
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      avatar_url = EXCLUDED.avatar_url,
      google_sub = COALESCE(profiles.google_sub, EXCLUDED.google_sub)
    RETURNING id, name, avatar_url
  `;
    return rows[0] as unknown as ProfileRow;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: { strategy: "jwt" },
    providers: [Google],
    pages: { signIn: "/login" },
    callbacks: {
        async jwt({ token, user, account }) {
            if (user?.email) {
                try {
                    const profile = await upsertProfile({
                        email: user.email,
                        name: user.name ?? null,
                        image: user.image ?? null,
                        sub: account?.providerAccountId ?? null,
                    });
                    token.profileId = profile.id;
                    token.name = profile.name ?? token.name;
                    token.picture = profile.avatar_url ?? token.picture;
                } catch (error) {
                    console.error("profile upsert failed", error);
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (typeof token.profileId === "string") {
                session.user.profileId = token.profileId;
            }
            return session;
        },
    },
});
