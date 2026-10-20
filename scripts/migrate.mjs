#!/usr/bin/env node
/**
 * Applique les migrations SQL versionnées (migrations/*.sql) sur Neon/Postgres.
 * - Chaque fichier est exécuté une seule fois, enregistré dans _migrations.
 * - Chaque migration tourne dans sa propre transaction.
 *
 * Usage :
 *   node scripts/migrate.mjs            # applique les migrations en attente
 *   node scripts/migrate.mjs --status   # liste appliquées / en attente
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { requireDatabaseUrl } from "./_env.mjs";

neonConfig.webSocketConstructor = ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

function listMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function main() {
  const statusOnly = process.argv.includes("--status");
  const connectionString = requireDatabaseUrl();
  const pool = new Pool({ connectionString });

  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id serial PRIMARY KEY,
          name text UNIQUE NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT now()
        );
      `);

      const applied = new Set(
        (await client.query("SELECT name FROM _migrations ORDER BY name")).rows.map((r) => r.name),
      );
      const files = listMigrationFiles();

      if (statusOnly) {
        console.log("\nMigrations :");
        for (const f of files) {
          console.log(`  ${applied.has(f) ? "✓ appliquée" : "· en attente"}  ${f}`);
        }
        console.log("");
        return;
      }

      const pending = files.filter((f) => !applied.has(f));
      if (pending.length === 0) {
        console.log("✓ Aucune migration en attente. Base à jour.");
        return;
      }

      for (const file of pending) {
        const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
        process.stdout.write(`→ Application de ${file} ... `);
        try {
          await client.query("BEGIN");
          await client.query(sql);
          await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
          await client.query("COMMIT");
          console.log("ok");
        } catch (err) {
          await client.query("ROLLBACK");
          console.log("ÉCHEC");
          throw err;
        }
      }
      console.log(`\n✓ ${pending.length} migration(s) appliquée(s).`);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n✖ Erreur de migration :", err?.message ?? err);
  process.exit(1);
});
