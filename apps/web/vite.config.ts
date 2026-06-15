import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig, type Plugin } from "vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";

/** Always resolve Wrangler + Vite root to this app (works when Turbo cwd differs). */
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, "../..");
const wranglerConfigPath = path.join(appRoot, "wrangler.jsonc");

const dbPackage = path.resolve(repoRoot, "packages/db");
const dbModuleId = "@workspace/db/db";
const dbReal = path.resolve(dbPackage, "db.ts");
const dbStub = path.resolve(dbPackage, "db.stub.ts");
const cfWorkersStub = path.resolve(appRoot, "lib/cloudflare-workers-stub.ts");

const repoPackages = [
  "@workspace/db",
  "@workspace/file-search",
  "@workspace/nextcloud",
];

function isDbModule(source: string, importer?: string): boolean {
  if (source === dbModuleId) return true;
  if (source === "./db" || source === "./db.ts") {
    return Boolean(
      importer?.includes(`${path.sep}packages${path.sep}db${path.sep}`),
    );
  }

  const resolved = path.normalize(source.split("?")[0] ?? source);
  return resolved === dbReal || resolved.endsWith(`${path.sep}db${path.sep}db.ts`);
}

function environmentAlias(): Plugin {
  return {
    name: "environment-alias",
    enforce: "pre",
    resolveId(source, importer) {
      if (source === "cloudflare:workers" && this.environment.name === "client") {
        return cfWorkersStub;
      }

      if (!isDbModule(source, importer)) return null;
      return this.environment.name === "client" ? dbStub : dbReal;
    },
  };
}

export default defineConfig({
  root: appRoot,
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [
    environmentAlias(),
    cloudflare({
      viteEnvironment: { name: "ssr" },
      remoteBindings: true,
      configPath: wranglerConfigPath,
    }),
    tanstackStart({
      srcDirectory: "app",
      router: {
        routesDirectory: ".",
        routeFileIgnorePattern:
          "^(routeTree\\.gen|router|client|server|start)\\.",
      },
    }),
    tailwindcss(),
    viteReact(),
    tsconfigPaths(),
  ],
  server: {
    port: 3000,
    allowedHosts: [".trycloudflare.com", "recruiting.darkalphacapital.com"],
  },
  build: {
    rolldownOptions: {
      external: ["cloudflare:workers"],
    },
  },
  resolve: {
    alias: {
      react: path.join(repoRoot, "node_modules/react"),
      "react-dom": path.join(repoRoot, "node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  ssr: {
    noExternal: [...repoPackages],
  },
  optimizeDeps: {
    exclude: ["@workspace/db"],
    include: ["buffer"],
  },
});
