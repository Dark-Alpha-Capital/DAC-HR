import { env } from "cloudflare:workers";

type PrismicEnv = {
  PRISMIC_REPOSITORY_NAME?: string;
  PRISMIC_ACCESS_TOKEN?: string;
  PRISMIC_TEAM_MEMBER_TYPE?: string;
  PRISMIC_OPERATING_MEMBER_TYPE?: string;
};

// SAFETY: the Workers env object is a key/value map of binding values; we
// only access the Prismic vars declared in wrangler.jsonc vars.
const workerEnv = env as PrismicEnv;

function pickEnvValue(primary?: string, fallback?: string): string | undefined {
  const preferred = primary?.trim();
  if (preferred) return preferred;

  const secondary = fallback?.trim();
  if (secondary) return secondary;

  return undefined;
}

/** Prismic repository API name (Settings → Repository → API endpoint). */
export function getPrismicRepositoryName(): string {
  const name = pickEnvValue(
    workerEnv.PRISMIC_REPOSITORY_NAME,
    process.env.PRISMIC_REPOSITORY_NAME,
  );

  if (!name) {
    throw new Error(
      "PRISMIC_REPOSITORY_NAME is missing. Set it in wrangler.jsonc vars or .dev.vars (e.g. darkalpha).",
    );
  }

  return name;
}

/** Optional — required only when Content API access is Private. */
export function getPrismicAccessToken(): string | undefined {
  return pickEnvValue(
    workerEnv.PRISMIC_ACCESS_TOKEN,
    process.env.PRISMIC_ACCESS_TOKEN,
  );
}

/** Custom type API ID for TeamMember documents. */
export function getTeamMemberType(): string {
  return (
    pickEnvValue(
      workerEnv.PRISMIC_TEAM_MEMBER_TYPE,
      process.env.PRISMIC_TEAM_MEMBER_TYPE,
    ) ?? "teammember"
  );
}

/** Custom type API ID for OperatingMember documents. */
export function getOperatingMemberType(): string {
  return (
    pickEnvValue(
      workerEnv.PRISMIC_OPERATING_MEMBER_TYPE,
      process.env.PRISMIC_OPERATING_MEMBER_TYPE,
    ) ?? "operatingmember"
  );
}
