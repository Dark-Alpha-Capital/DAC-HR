import { env } from "cloudflare:workers";

function trimKey(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolves the OpenAI API key for Worker route handlers and DOs.
 * Wrangler loads `.dev.vars` / secrets into `env` (cloudflare:workers).
 * Vite may also load `.env` into `process.env` — keep both in sync locally.
 */
export function getServerOpenAIApiKey(): string {
  const fromBinding = trimKey(env.OPENAI_API_KEY);
  const fromProcess = trimKey(process.env.OPENAI_API_KEY);

  // Workers runtime (routes, DO, workflows) receives secrets via env binding.
  if (fromBinding) {
    return fromBinding;
  }

  if (fromProcess) {
    return fromProcess;
  }

  throw new Error(
    "OPENAI_API_KEY is not set. Configure it in .dev.vars (local) or Worker secrets (production).",
  );
}

export function describeOpenAIKeySources(): {
  bindingLast4?: string;
  processLast4?: string;
  resolvedSource: "binding" | "process" | "none";
  keysMatch: boolean;
  keysMismatchWarning?: string;
} {
  const fromBinding = trimKey(env.OPENAI_API_KEY);
  const fromProcess = trimKey(process.env.OPENAI_API_KEY);
  const fingerprint = (key: string) =>
    key.length >= 4 ? key.slice(-4) : undefined;

  let resolvedSource: "binding" | "process" | "none" = "none";
  try {
    getServerOpenAIApiKey();
    if (fromBinding) {
      resolvedSource = "binding";
    } else if (fromProcess) {
      resolvedSource = "process";
    }
  } catch {
    resolvedSource = "none";
  }

  const keysMatch =
    !fromBinding || !fromProcess || fromBinding === fromProcess;

  return {
    bindingLast4: fingerprint(fromBinding),
    processLast4: fingerprint(fromProcess),
    resolvedSource,
    keysMatch,
    keysMismatchWarning:
      import.meta.env.DEV && !keysMatch && fromBinding && fromProcess
        ? "OPENAI_API_KEY differs between env binding (.dev.vars) and process.env (.env). Sync both files and restart `bun run dev`."
        : undefined,
  };
}
