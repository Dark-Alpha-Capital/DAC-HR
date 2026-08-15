import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@workspace/db/db";
import { eq } from "@workspace/db";
import {
  user as usersTable,
  account as accountsTable,
  session as sessionsTable,
  verification as verificationsTable,
} from "@workspace/db/schema";
import { admin } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";
import {
  isAllowedEmail,
  UNAUTHORIZED_DOMAIN_MESSAGE,
} from "#/features/auth/helpers";

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

const AUTH_ALLOWED_HOSTS = [
  "localhost",
  "localhost:3000",
  "127.0.0.1",
  "127.0.0.1:3000",
  "recruiting.darkalphacapital.com",
] as const;

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
  baseURL: {
    allowedHosts: [...AUTH_ALLOWED_HOSTS],
    fallback: "https://recruiting.darkalphacapital.com",
    protocol: "auto",
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://recruiting.darkalphacapital.com",
  ],
  onAPIError: {
    errorURL: "/unauthorized",
  },
  database: drizzleAdapter(db, {
    provider: "sqlite",
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
  // OAuth state is stored in D1; skip the short-lived signed cookie check.
  // Google consent (esp. Meet/Calendar scopes) can exceed the ~5m cookie TTL.
  account: {
    skipStateCookieCheck: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/meetings.space.readonly",
      ],
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
  plugins: [admin()],

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
              message: UNAUTHORIZED_DOMAIN_MESSAGE,
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
              message: UNAUTHORIZED_DOMAIN_MESSAGE,
            });
          }
          if (!isAllowedEmail(user.email)) {
            console.warn("[auth] blocked.session.create", {
              emailRedacted: redactEmail(user.email),
              reason: "email_domain_not_allowed",
            });
            throw new APIError("BAD_REQUEST", {
              message: UNAUTHORIZED_DOMAIN_MESSAGE,
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
            message: UNAUTHORIZED_DOMAIN_MESSAGE,
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
      const isEmailAuth = ["/sign-in/email", "/sign-up/email"].includes(
        ctx.path,
      );
      if (
        (isCallback || isSignInSocial || isEmailAuth) &&
        ctx.context.newSession
      ) {
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
            await db
              .delete(sessionsTable)
              .where(eq(sessionsTable.id, sessionId));
          }
          throw ctx.redirect("/unauthorized");
        }
      }
    }),
  },
});
