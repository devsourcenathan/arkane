import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), cloudflare({ viteEnvironment: { name: "worker" } })],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  environments: {
    worker: {
      build: { sourcemap: true },
    },
  },
});
