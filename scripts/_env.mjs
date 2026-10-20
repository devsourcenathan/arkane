import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/**
 * Charge les variables depuis .dev.vars (local) puis process.env (prioritaire).
 * Parse les lignes KEY=value / KEY="value", ignore commentaires et lignes vides.
 */
export function loadEnv() {
  const env = {};
  const devVars = join(ROOT, ".dev.vars");
  if (existsSync(devVars)) {
    const content = readFileSync(devVars, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
  // process.env a la priorité (utile en CI).
  for (const key of Object.keys(process.env)) {
    if (process.env[key] !== undefined && process.env[key] !== "") env[key] = process.env[key];
  }
  return env;
}

export function requireDatabaseUrl() {
  const env = loadEnv();
  const url = env.DATABASE_URL;
  if (!url || url.includes("user:password@host")) {
    console.error(
      "\n✖ DATABASE_URL introuvable ou non configuré.\n" +
        "  Renseignez votre chaîne Neon dans .dev.vars ou via la variable d'environnement DATABASE_URL.\n",
    );
    process.exit(1);
  }
  return url;
}
