import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from '@cloudflare/vite-plugin'


const appRoot = path.dirname(fileURLToPath(import.meta.url));

const dbPackage = path.resolve(appRoot, "../../packages/db");

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    rolldownOptions: {
      external: ["cloudflare:workers"],
    },
  },
  environments: {
    client: {
      resolve: {
        alias: {
          "@workspace/db/db": path.resolve(dbPackage, "db.stub.ts"),
        },
      },
    },
    ssr: {
      resolve: {
        alias: {
          "@workspace/db/db": path.resolve(dbPackage, "db.ts"),
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": appRoot,
      "@workspace/ui/globals.css": path.resolve(
        appRoot,
        "../../packages/ui/src/styles/globals.css",
      ),
    },
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),


    tanstackStart({
      srcDirectory: "app",
      // Routes live directly under app/ (__root.tsx, login.tsx, _main/, api/), not app/routes/
      router: {
        routesDirectory: ".",
        routeFileIgnorePattern: "^(routeTree\\.gen|router|client|server)\\.",
      },
    }),
    viteReact(),
    tailwindcss(),
  ],
});
