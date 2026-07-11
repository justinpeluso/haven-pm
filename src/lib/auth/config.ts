import type { NextAuthConfig } from "next-auth";

type AppRole =
  | "ADMINISTRATOR"
  | "PROPERTY_MANAGER"
  | "LEASING_AGENT"
  | "MAINTENANCE_STAFF"
  | "OFFICE_STAFF"
  | "TENANT"
  | "PROSPECT";

/** Edge-safe auth config — no Prisma/bcrypt (keeps middleware under Vercel size limit). */
export const authConfig = {
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role?: AppRole }).role as AppRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: AppRole }).role = token.role as AppRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
