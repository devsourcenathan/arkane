import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Configuration de test dédiée : pas de plugin Cloudflare ici.
// - Les tests frontend tournent en jsdom.
// - La logique métier du Worker (services, calculs, schémas) est testée en pur Node
//   via des dépôts en mémoire (injection de dépendances), sans réseau ni Neon.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "worker/**/*.test.ts", "shared/**/*.test.ts", "tests/**/*.test.ts"],
    css: false,
  },
});
