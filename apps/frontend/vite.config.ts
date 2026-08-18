import path from "path";
import { fileURLToPath } from "url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig, type Plugin } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, "../..");
const dbPackage = path.resolve(repoRoot, "packages/db");
const dbModuleId = "@workspace/db/db";
const dbReal = path.resolve(dbPackage, "src/db.ts");
const dbStub = path.resolve(dbPackage, "src/db.stub.ts");
const cfWorkersStub = path.resolve(appRoot, "src/lib/cloudflare-workers-stub.ts");

const repoPackages = [
  "@workspace/db",
  "@workspace/ai-config",
  "@workspace/nextcloud",
  "@workspace/interview-realtime",
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
  server: {
    port: 3000,
  },
  build: {
    rolldownOptions: {
      external: ["cloudflare:workers"],
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: [...repoPackages, /^@radix-ui\//],
  },
  optimizeDeps: {
    exclude: ["@workspace/db"],
    include: ["@tanstack/react-table"],
  },
  plugins: [
    environmentAlias(),
    cloudflare({
      viteEnvironment: { name: "ssr" },
      remoteBindings: false,
      configPath: "./wrangler.jsonc",
    }),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
    }),
    viteReact(),
  ],
});
