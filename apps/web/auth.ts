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

const redactEmail = (email: string | null | undefined): string => {
  if (!email) return "unknown";
  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) return "***";
  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  const visible = localPart.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(localPart.length - 2, 1))}@${domainPart}`;
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
          console.info("[auth] user.create.before", {
            emailRedacted: redactEmail(userData.email),
            path: "user.create",
          });
          if (!isAllowedEmail(userData.email)) {
            console.warn("[auth] blocked.user.create", {
              emailRedacted: redactEmail(userData.email),
              reason: "email_domain_not_allowed",
            });
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
          console.info("[auth] session.create.before", {
            userId: sessionData.userId,
          });
          const [userRow] = await db
            .select({ email: usersTable.email })
            .from(usersTable)
            .where(eq(usersTable.id, sessionData.userId))
            .limit(1);
          const user = userRow ? { email: userRow.email } : null;
          if (!user) {
            console.warn("[auth] blocked.session.create", {
              userId: sessionData.userId,
              reason: "user_not_found",
            });
            throw new APIError("BAD_REQUEST", {
              message: UNAUTHORIZED_MESSAGE,
            });
          }
          if (!isAllowedEmail(user.email)) {
            console.warn("[auth] blocked.session.create", {
              emailRedacted: redactEmail(user.email),
              reason: "email_domain_not_allowed",
            });
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
      console.info("[auth] hooks.before", {
        path: ctx.path,
        bodyKeys: ctx.body ? Object.keys(ctx.body) : [],
      });
      const emailPaths = ["/sign-in/email", "/sign-up/email"];
      if (emailPaths.includes(ctx.path) && ctx.body?.email) {
        if (!isAllowedEmail(ctx.body.email as string)) {
          console.warn("[auth] blocked.hooks.before", {
            path: ctx.path,
            emailRedacted: redactEmail(ctx.body.email as string),
            reason: "email_domain_not_allowed",
          });
          throw new APIError("BAD_REQUEST", {
            message: UNAUTHORIZED_MESSAGE,
          });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      console.info("[auth] hooks.after", {
        path: ctx.path,
        hasNewSession: !!ctx.context.newSession,
      });
      const isCallback = ctx.path.startsWith("/callback/");
      const isSignInSocial = ctx.path === "/sign-in/social";
      if ((isCallback || isSignInSocial) && ctx.context.newSession) {
        const newSession = ctx.context.newSession;
        const signedInUser = newSession.user;
        console.info("[auth] hooks.after.session_created", {
          path: ctx.path,
          emailRedacted: redactEmail(signedInUser.email),
          isAllowed: isAllowedEmail(signedInUser.email),
        });
        if (!isAllowedEmail(signedInUser.email)) {
          const sessionId = newSession.session?.id;
          console.warn("[auth] blocked.hooks.after", {
            path: ctx.path,
            sessionId,
            reason: "email_domain_not_allowed",
          });
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
