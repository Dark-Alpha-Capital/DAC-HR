import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env as workerEnv } from "cloudflare:workers";
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
import { enqueueEmail } from "#/lib/queues/enqueue";
import {
  isAllowedEmail,
  UNAUTHORIZED_DOMAIN_MESSAGE,
} from "../helpers";

async function sendAuthEmail(
  kind: "verification" | "password-reset",
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  try {
    await enqueueEmail(db, [
      {
        jobName: "auth-email",
        jobId: `auth-${kind}-${Date.now()}-${to.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        dedupeKey: `auth:${kind}:${to}`,
        data: {
          type: "auth-email" as const,
          to,
          subject,
          html,
        },
      },
    ]);
  } catch (error) {
    // Never fail sign-in/sign-up because the email outbox is unavailable.
    console.error(`[auth] Failed to enqueue ${kind} email to ${to}:`, error);
  }
}

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

export const auth = betterAuth({
  secret: workerEnv.BETTER_AUTH_SECRET,
  baseURL: workerEnv.BETTER_AUTH_URL,
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
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: { email: string };
      url: string;
      token: string;
    }) => {
      await sendAuthEmail(
        "password-reset",
        user.email,
        "Reset your password",
        `<p>Click the link to reset your password: <a href="${url}">${url}</a></p>
         <p>This link will expire in 1 hour.</p>
         <p>If you didn't request this, please ignore this email.</p>`,
      );
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string };
      url: string;
      token: string;
    }) => {
      await sendAuthEmail(
        "verification",
        user.email,
        "Verify your email address",
        `<p>Click the link to verify your email: <a href="${url}">${url}</a></p>
         <p>If you didn't create an account, you can ignore this email.</p>`,
      );
    },
  },
  // OAuth state is stored in D1; skip the short-lived signed cookie check.
  // Google consent (esp. Meet/Calendar scopes) can exceed the ~5m cookie TTL.
  account: {
    skipStateCookieCheck: true,
  },
  socialProviders: {
    google: {
      // SAFETY: the Google OAuth client credentials are required for the
      // social provider and are configured as Worker secrets; the provider
      // API expects plain strings.
      clientId: workerEnv.GOOGLE_CLIENT_ID,
      // SAFETY: see clientId — secret is also a required Worker secret.
      clientSecret: workerEnv.GOOGLE_CLIENT_SECRET,
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
        // SAFETY: the sign-in/sign-up email paths submit the email address as
        // a JSON string in the request body (guarded truthy above).
        const email = ctx.body.email as string;
        if (!isAllowedEmail(email)) {
          console.warn("[auth] blocked.hooks.before", {
            path: ctx.path,
            emailRedacted: redactEmail(email),
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
