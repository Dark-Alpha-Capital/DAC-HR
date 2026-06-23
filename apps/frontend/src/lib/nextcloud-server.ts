import { env } from "cloudflare:workers";
import {
  getNextcloudClient,
  type NextcloudConfig,
  type WebDAVClient,
} from "@workspace/nextcloud";

function pickEnvValue(primary?: string, fallback?: string): string | undefined {
  const preferred = primary?.trim();
  if (preferred) {
    return preferred;
  }

  const secondary = fallback?.trim();
  if (secondary) {
    return secondary;
  }

  return undefined;
}

export function getServerNextcloudConfig(): NextcloudConfig {
  const url = pickEnvValue(env.NEXTCLOUD_URL, process.env.NEXTCLOUD_URL);
  const user = pickEnvValue(env.NEXTCLOUD_USER, process.env.NEXTCLOUD_USER);
  const password = pickEnvValue(
    env.NEXTCLOUD_PASSWORD,
    process.env.NEXTCLOUD_PASSWORD,
  );

  if (!url || !user || !password) {
    throw new Error(
      "Nextcloud configuration is missing. Set NEXTCLOUD_URL, NEXTCLOUD_USER, and NEXTCLOUD_PASSWORD in .dev.vars (local) or Worker secrets (production).",
    );
  }

  return { url, user, password };
}

export function getServerNextcloudClient(): WebDAVClient {
  return getNextcloudClient(getServerNextcloudConfig());
}
