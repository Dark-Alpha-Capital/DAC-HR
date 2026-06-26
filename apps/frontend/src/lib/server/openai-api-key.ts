import { env } from "cloudflare:workers";

function trimKey(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolves the OpenAI API key for Worker route handlers.
 * In local dev, prefer process.env (.dev.vars) when it differs from the remote binding.
 */
export function getServerOpenAIApiKey(): string {
  const fromBinding = trimKey(env.OPENAI_API_KEY);
  const fromProcess = trimKey(process.env.OPENAI_API_KEY);

  if (import.meta.env.DEV && fromProcess) {
    return fromProcess;
  }

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
} {
  const fromBinding = trimKey(env.OPENAI_API_KEY);
  const fromProcess = trimKey(process.env.OPENAI_API_KEY);
  const fingerprint = (key: string) =>
    key.length >= 4 ? key.slice(-4) : undefined;

  let resolvedSource: "binding" | "process" | "none" = "none";
  try {
    getServerOpenAIApiKey();
    if (import.meta.env.DEV && fromProcess) {
      resolvedSource = "process";
    } else if (fromBinding) {
      resolvedSource = "binding";
    } else if (fromProcess) {
      resolvedSource = "process";
    }
  } catch {
    resolvedSource = "none";
  }

  return {
    bindingLast4: fingerprint(fromBinding),
    processLast4: fingerprint(fromProcess),
    resolvedSource,
    keysMatch: !fromBinding || !fromProcess || fromBinding === fromProcess,
  };
}
