import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, eq } from "@workspace/db";
import { config } from "dotenv";
import { nextCookies } from "better-auth/next-js";
import {
  user as usersTable,
  account as accountsTable,
  session as sessionsTable,
  verification as verificationsTable,
} from "@workspace/db/schema";
import { admin, customSession } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";

config({
  path: ".env",
});

const ADMIN_EMAILS: string[] = [
  "rahulguptax14@gmail.com",
  "rahul@darkalphacapital.com",
  "gaurav@darkalphacapital.com",
  "andres@darkalphacapital.com",
  "da@darkalphacapital.com",
];

const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: usersTable,
      account: accountsTable,
      session: sessionsTable,
      verification: verificationsTable,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    nextCookies(),
    admin(),
    customSession(async ({ user, session }) => {
      const isAdmin = isAdminEmail(user.email);
      return {
        user: {
          ...user,
          role: isAdmin ? "admin" : "user",
        },
        session: {
          ...session,
        },
      };
    }),
  ],

  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          if (userData.email && isAdminEmail(userData.email)) {
            return {
              data: {
                ...userData,
                role: "admin",
              },
            };
          }
          return {
            data: {
              ...userData,
              role: userData.role || "user",
            },
          };
        },
      },
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/social" && ctx.context.newSession) {
        const signedInUser = ctx.context.newSession.user;

        if (
          signedInUser.email &&
          isAdminEmail(signedInUser.email) &&
          signedInUser.role !== "admin"
        ) {
          await db
            .update(usersTable)
            .set({ role: "admin" })
            .where(eq(usersTable.id, signedInUser.id));
        }
      }
    }),
  },
});
