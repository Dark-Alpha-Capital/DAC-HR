import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@workspace/db";
import { config } from "dotenv";
import { nextCookies } from "better-auth/next-js";
import { user, account, session, verification } from "@workspace/db/schema";
import { admin, customSession } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { eq } from "drizzle-orm";
import type { Auth } from "better-auth";

config({
  path: ".env",
});

// List of admin email addresses
const ADMIN_EMAILS: string[] = [
  "rahulguptax14@gmail.com",
  "rahul@darkalphacapital.com",
];

// Check if an email is an admin email
const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

export const auth: Auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      account,
      session,
      verification,
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
          isAdmin,
        },
        session: {
          ...session,
        },
      };
    }),
  ],

  // Database hooks to set admin role for new users
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          // Set admin role if email is in admin list
          if (userData.email && isAdminEmail(userData.email)) {
            return {
              data: {
                ...userData,
                role: "admin",
              },
            };
          }
          // Return default role for non-admin users
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

  // Hook to check and update role on sign-in (for existing users)
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Check if this is a social sign-in endpoint and a new session was created
      if (ctx.path === "/sign-in/social" && ctx.context.newSession) {
        const signedInUser = ctx.context.newSession.user;

        // If user is signing in and their email is in admin list but they don't have admin role
        if (
          signedInUser.email &&
          isAdminEmail(signedInUser.email) &&
          signedInUser.role !== "admin"
        ) {
          // Update the user's role to admin
          await db
            .update(user)
            .set({ role: "admin" })
            .where(eq(user.id, signedInUser.id));
        }
      }
    }),
  },
});
