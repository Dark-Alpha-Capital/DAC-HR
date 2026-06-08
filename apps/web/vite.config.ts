import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    port: 3000,
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
