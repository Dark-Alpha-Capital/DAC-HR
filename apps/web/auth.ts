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
import { createAuthMiddleware, APIError } from "better-auth/api";

config({
  path: ".env",
});

const ADMIN_EMAILS: string[] = [
  "rahul@darkalphacapital.com",
  "gaurav@darkalphacapital.com",
  "da@darkalphacapital.com",
];

const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

const ALLOWED_DOMAIN = "darkalphacapital.com";

const isAllowedEmail = (email: string | null | undefined): boolean => {
  return !!email?.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
};

const UNAUTHORIZED_MESSAGE =
  "Only Dark Alpha Capital (@darkalphacapital.com) email addresses can access this site.";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  onAPIError: {
    errorURL: "/unauthorized",
  },
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
          console.log("[auth] databaseHooks.user.create.before", {
            email: userData.email,
            path: "user.create",
          });
          if (!isAllowedEmail(userData.email)) {
            console.log("[auth] BLOCKED: user create - non-allowed email", userData.email);
            throw new APIError("BAD_REQUEST", {
              message: UNAUTHORIZED_MESSAGE,
            });
          }
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
    session: {
      create: {
        before: async (sessionData) => {
          console.log("[auth] databaseHooks.session.create.before", {
            userId: sessionData.userId,
          });
          const [userRow] = await db
            .select({ email: usersTable.email })
            .from(usersTable)
            .where(eq(usersTable.id, sessionData.userId))
            .limit(1);
          const user = userRow ? { email: userRow.email } : null;
          if (!user) {
            console.log("[auth] session.create: user not found", sessionData.userId);
            throw new APIError("BAD_REQUEST", {
              message: UNAUTHORIZED_MESSAGE,
            });
          }
          if (!isAllowedEmail(user.email)) {
            console.log("[auth] BLOCKED: session create - non-allowed email", user.email);
            throw new APIError("BAD_REQUEST", {
              message: UNAUTHORIZED_MESSAGE,
            });
          }
          return { data: sessionData };
        },
      },
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      console.log("[auth] hooks.before", { path: ctx.path, bodyKeys: ctx.body ? Object.keys(ctx.body) : [] });
      const emailPaths = ["/sign-in/email", "/sign-up/email"];
      if (emailPaths.includes(ctx.path) && ctx.body?.email) {
        if (!isAllowedEmail(ctx.body.email as string)) {
          console.log("[auth] BLOCKED: before hook - non-allowed email", ctx.body.email);
          throw new APIError("BAD_REQUEST", {
            message: UNAUTHORIZED_MESSAGE,
          });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      console.log("[auth] hooks.after", {
        path: ctx.path,
        hasNewSession: !!ctx.context.newSession,
      });
      const isCallback = ctx.path.startsWith("/callback/");
      const isSignInSocial = ctx.path === "/sign-in/social";
      if ((isCallback || isSignInSocial) && ctx.context.newSession) {
        const newSession = ctx.context.newSession;
        const signedInUser = newSession.user;
        console.log("[auth] after hook - session created", {
          path: ctx.path,
          email: signedInUser.email,
          isAllowed: isAllowedEmail(signedInUser.email),
        });
        if (!isAllowedEmail(signedInUser.email)) {
          const sessionId = newSession.session?.id;
          console.log("[auth] BLOCKED: after hook - deleting session", sessionId);
          if (sessionId) {
            await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
          }
          throw ctx.redirect("/unauthorized");
        }
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
