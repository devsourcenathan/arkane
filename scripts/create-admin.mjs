#!/usr/bin/env node
/**
 * Initialise (ou met à jour) le compte administrateur unique.
 * Aucun endpoint public d'inscription n'existe : c'est le seul moyen de créer l'admin.
 *
 * Usage :
 *   node scripts/create-admin.mjs --email admin@arkane.cm --password "motDePasseFort"
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/create-admin.mjs
 *   node scripts/create-admin.mjs --email admin@arkane.cm        # mot de passe généré et affiché
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { randomBytes } from "node:crypto";
import { requireDatabaseUrl, loadEnv } from "./_env.mjs";
import { hashPassword } from "./_crypto.mjs";

neonConfig.webSocketConstructor = ws;

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") out.email = argv[++i];
    else if (a === "--password") out.password = argv[++i];
    else if (a === "--name") out.name = argv[++i];
  }
  return out;
}

function generatePassword() {
  // 18 octets -> ~24 caractères base64url, forte entropie.
  return randomBytes(18).toString("base64url");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function main() {
  const env = loadEnv();
  const args = parseArgs(process.argv);

  const email = (args.email || env.ADMIN_EMAIL || "").trim();
  const name = (args.name || env.ADMIN_NAME || "").trim();
  let password = args.password || env.ADMIN_PASSWORD || "";
  let generated = false;

  if (!email || !isValidEmail(email)) {
    console.error("✖ Email invalide ou manquant. Utilisez --email <adresse> ou ADMIN_EMAIL.");
    process.exit(1);
  }
  if (!password) {
    password = generatePassword();
    generated = true;
  }
  if (password.length < 10) {
    console.error("✖ Le mot de passe doit contenir au moins 10 caractères.");
    process.exit(1);
  }

  const connectionString = requireDatabaseUrl();
  const pool = new Pool({ connectionString });
  try {
    const client = await pool.connect();
    try {
      const passwordHash = await hashPassword(password);
      const existing = await client.query("SELECT id FROM admin_users WHERE lower(email) = lower($1)", [
        email,
      ]);

      if (existing.rows.length > 0) {
        await client.query(
          "UPDATE admin_users SET password_hash = $1, display_name = COALESCE(NULLIF($2, ''), display_name) WHERE id = $3",
          [passwordHash, name, existing.rows[0].id],
        );
        console.log(`✓ Mot de passe de l'administrateur « ${email} » mis à jour.`);
      } else {
        await client.query(
          "INSERT INTO admin_users (email, password_hash, display_name) VALUES ($1, $2, NULLIF($3, ''))",
          [email, passwordHash, name],
        );
        console.log(`✓ Administrateur « ${email} » créé.`);
      }

      if (generated) {
        console.log("\n  Mot de passe généré (notez-le, il ne sera plus affiché) :");
        console.log(`  ${password}\n`);
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n✖ Erreur :", err?.message ?? err);
  process.exit(1);
});
