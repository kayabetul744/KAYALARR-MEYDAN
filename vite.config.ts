import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(async ({ command }) => {
  const plugins = [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    viteReact(),
  ];

  // nitro builds the deployable server bundle; it auto-detects the target
  // platform (e.g. Vercel) from the build environment, so no preset is pinned here.
  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    plugins.splice(3, 0, nitro());
  }

  return {
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    plugins,
  };
});
