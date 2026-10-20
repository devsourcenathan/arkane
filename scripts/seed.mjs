#!/usr/bin/env node
/**
 * Remplit la base de DONNÉES DE TEST pour toutes les ressources :
 * paramètres, médias (images grises de démo), artistes, productions, services,
 * produits + variantes, commandes et messages — avec traductions anglaises.
 *
 * ⚠️ Ré-exécutable : vide d'abord le contenu, les commandes et les messages,
 *    puis réinsère. Ne touche pas aux comptes administrateurs.
 *
 * Usage : node scripts/seed.mjs   (ou : npm run seed)
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { createHash, randomBytes } from "node:crypto";
import { requireDatabaseUrl } from "./_env.mjs";

neonConfig.webSocketConstructor = ws;

const img = (seed, w = 800, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}?grayscale`;
const ref = () => {
  const a = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const b = randomBytes(8);
  return "ARK-" + Array.from(b, (x) => a[x % a.length]).join("");
};
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

async function main() {
  const pool = new Pool({ connectionString: requireDatabaseUrl() });
  const c = await pool.connect();
  try {
    await c.query("BEGIN");

    // ---- Nettoyage (ordre : enfants -> parents) ----
    await c.query("DELETE FROM order_items");
    await c.query("DELETE FROM orders");
    await c.query("DELETE FROM contact_messages");
    await c.query("DELETE FROM product_images");
    await c.query("DELETE FROM product_variants");
    await c.query("DELETE FROM products");
    await c.query("DELETE FROM project_artists");
    await c.query("DELETE FROM projects");
    await c.query("DELETE FROM services");
    await c.query("DELETE FROM artists");
    await c.query("DELETE FROM team_members");
    await c.query("DELETE FROM media");

    const one = async (sql, params) => (await c.query(sql, params)).rows[0];

    const addMedia = async (key, alt, w, h) =>
      (
        await one(
          `INSERT INTO media (r2_key, filename, content_type, size_bytes, width, height, alt)
           VALUES ($1,$2,'image/jpeg',0,$3,$4,$5) RETURNING id`,
          [key, key.split("/").pop(), w, h, alt],
        )
      ).id;

    /* ----------------------------- Artistes ----------------------------- */
    const artists = [
      {
        slug: "nova-mbarga", name: "Nova Mbarga", role: "Chanteuse · Autrice",
        bio: "Voix singulière de la nouvelle scène afro-pop, Nova mêle mélodies douces et textes engagés.",
        en: { roleTitle: "Singer · Songwriter", bio: "A singular voice of the new afro-pop scene, Nova blends soft melodies with committed lyrics." },
        socials: { ig: "https://instagram.com/", yt: "https://youtube.com/", sp: "https://open.spotify.com/", tk: "https://tiktok.com/" },
      },
      {
        slug: "k-rhodes", name: "K. Rhodes", role: "Rappeur · Producteur",
        bio: "Plumes acérées et prods léchées : K. Rhodes impose un style à la frontière du rap et de l'électro.",
        en: { roleTitle: "Rapper · Producer", bio: "Sharp pen and polished beats: K. Rhodes sits at the border of rap and electronic music." },
        socials: { ig: "https://instagram.com/", yt: "https://youtube.com/", tk: "https://tiktok.com/", x: "https://x.com/" },
      },
      {
        slug: "lia-sun", name: "Lia Sun", role: "Artiste R&B",
        bio: "Entre soul et R&B contemporain, Lia Sun cultive une signature feutrée et lumineuse.",
        en: { roleTitle: "R&B artist", bio: "Between soul and contemporary R&B, Lia Sun cultivates a hushed, luminous signature." },
        socials: { ig: "https://instagram.com/", sp: "https://open.spotify.com/", am: "https://music.apple.com/" },
      },
      {
        slug: "atreyu", name: "Atreyu", role: "Beatmaker",
        bio: "Architecte sonore, Atreyu façonne des instrumentales cinématiques pour la scène locale et au-delà.",
        en: { roleTitle: "Beatmaker", bio: "A sound architect, Atreyu crafts cinematic instrumentals for the local scene and beyond." },
        socials: { ig: "https://instagram.com/", yt: "https://youtube.com/" },
      },
    ];
    const artistIds = {};
    let i = 0;
    for (const a of artists) {
      const portrait = await addMedia(img(`artist-${a.slug}`, 800, 1000), a.name, 800, 1000);
      const row = await one(
        `INSERT INTO artists (slug, name, role_title, bio, portrait_media_id, social_instagram,
           social_youtube, social_spotify, social_apple_music, social_tiktok, social_x, status, sort_order, i18n)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published',$12,$13::jsonb) RETURNING id`,
        [
          a.slug, a.name, a.role, a.bio, portrait,
          a.socials.ig ?? "", a.socials.yt ?? "", a.socials.sp ?? "", a.socials.am ?? "",
          a.socials.tk ?? "", a.socials.x ?? "", i++, JSON.stringify({ en: a.en }),
        ],
      );
      artistIds[a.slug] = row.id;
    }

    /* ---------------------------- Productions ---------------------------- */
    const projects = [
      { slug: "nuit-blanche", title: "Nuit Blanche", cat: "Clip", featured: true, artists: ["nova-mbarga"],
        video: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        desc: "Un clip nocturne tourné en une seule nuit, entre néons et silences.",
        en: { title: "Nuit Blanche", description: "A nocturnal music video shot in a single night, between neon and silence." } },
      { slug: "echo", title: "Echo", cat: "Album", featured: true, artists: ["k-rhodes", "atreyu"],
        desc: "Direction artistique et production complète du premier album de K. Rhodes.",
        en: { title: "Echo", description: "Art direction and full production of K. Rhodes' debut album." } },
      { slug: "lumiere", title: "Lumière", cat: "Clip", featured: true, artists: ["lia-sun"],
        desc: "Portrait intime et lumineux, pensé comme un court-métrage musical.",
        en: { title: "Lumière", description: "An intimate, luminous portrait conceived as a musical short film." } },
      { slug: "racines", title: "Racines", cat: "Film", featured: false, artists: ["nova-mbarga", "lia-sun"],
        desc: "Film de marque mêlant musique originale et images d'archives.",
        en: { title: "Roots", description: "A brand film blending original music and archival footage." } },
      { slug: "signal", title: "Signal", cat: "Single", featured: false, artists: ["k-rhodes"],
        desc: "Production et mixage d'un single taillé pour les ondes.",
        en: { title: "Signal", description: "Production and mix of a single built for the airwaves." } },
      { slug: "horizon", title: "Horizon", cat: "Clip", featured: false, artists: ["atreyu"],
        desc: "Expérimentation visuelle autour d'une instrumentale ample et aérienne.",
        en: { title: "Horizon", description: "A visual experiment around a wide, airy instrumental." } },
    ];
    let pi = 0;
    for (const p of projects) {
      const cover = await addMedia(img(`project-${p.slug}`, 1000, 1000), p.title, 1000, 1000);
      const row = await one(
        `INSERT INTO projects (slug, title, category, description, cover_media_id, video_url, release_date,
           status, featured, sort_order, i18n)
         VALUES ($1,$2,$3,$4,$5,$6, now() - ($7 || ' days')::interval, 'published',$8,$9,$10::jsonb) RETURNING id`,
        [p.slug, p.title, p.cat, p.desc, cover, p.video ?? "", String(pi * 30), p.featured, pi, JSON.stringify({ en: p.en })],
      );
      let o = 0;
      for (const s of p.artists) {
        await c.query(
          "INSERT INTO project_artists (project_id, artist_id, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
          [row.id, artistIds[s], o++],
        );
      }
      pi++;
    }

    /* ------------------------------ Services ----------------------------- */
    const services = [
      { slug: "production-musicale", title: "Production musicale", summary: "Enregistrement, arrangement, mixage.",
        desc: "De la première prise au master, un accompagnement complet en studio.", price: 150000, note: "à partir de / jour",
        en: { title: "Music production", summary: "Recording, arrangement, mixing.", description: "From the first take to the master, full studio support.", priceNote: "from / day" } },
      { slug: "clip-video", title: "Clip vidéo", summary: "Écriture, tournage, montage.",
        desc: "Réalisation de clips cinématiques, de la note d'intention à la livraison.", price: 500000, note: "sur devis",
        en: { title: "Music video", summary: "Writing, shooting, editing.", description: "Cinematic music video production, from concept to delivery.", priceNote: "on quote" } },
      { slug: "mixage-mastering", title: "Mixage & mastering", summary: "Une finition prête à diffuser.",
        desc: "Mixage détaillé et mastering pour toutes les plateformes.", price: 60000, note: "par titre",
        en: { title: "Mixing & mastering", summary: "A release-ready finish.", description: "Detailed mixing and mastering for every platform.", priceNote: "per track" } },
      { slug: "direction-artistique", title: "Direction artistique", summary: "Une vision cohérente.",
        desc: "Identité visuelle et sonore, pensée avec l'artiste.", price: null, note: "sur mesure",
        en: { title: "Art direction", summary: "A coherent vision.", description: "Visual and sonic identity, shaped with the artist.", priceNote: "bespoke" } },
    ];
    let si = 0;
    for (const s of services) {
      const cover = await addMedia(img(`service-${s.slug}`, 1200, 800), s.title, 1200, 800);
      await c.query(
        `INSERT INTO services (slug, title, summary, description, price_from_xaf, price_note, cover_media_id, status, sort_order, i18n)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'published',$8,$9::jsonb)`,
        [s.slug, s.title, s.summary, s.desc, s.price, s.note, cover, si++, JSON.stringify({ en: s.en })],
      );
    }

    /* ------------------------------ Produits ----------------------------- */
    const products = [
      { slug: "tshirt-signature", name: "T-shirt Signature", cat: "Vêtements", price: 15000,
        desc: "T-shirt coton épais, sérigraphie monochrome.",
        en: { name: "Signature T-shirt", description: "Heavy cotton t-shirt, monochrome screen print." },
        variants: [["TS-S", "S", "Noir", 20], ["TS-M", "M", "Noir", 25], ["TS-L", "L", "Noir", 18], ["TS-XL", "XL", "Noir", 10]] },
      { slug: "hoodie-arkane", name: "Hoodie Arkane", cat: "Vêtements", price: 35000,
        desc: "Hoodie oversize, intérieur molletonné.",
        en: { name: "Arkane Hoodie", description: "Oversized hoodie, brushed fleece lining." },
        variants: [["HD-M", "M", "Noir", 12], ["HD-L", "L", "Noir", 8], ["HD-XL", "XL", "Noir", 5]] },
      { slug: "casquette", name: "Casquette brodée", cat: "Accessoires", price: 12000,
        desc: "Casquette 6 panneaux, logo brodé.",
        en: { name: "Embroidered cap", description: "6-panel cap, embroidered logo." },
        variants: [["CAP-U", "Taille unique", "Noir", 30]] },
      { slug: "tote-bag", name: "Tote bag", cat: "Accessoires", price: 8000,
        desc: "Sac en toile résistante, impression monochrome.",
        en: { name: "Tote bag", description: "Sturdy canvas bag, monochrome print." },
        variants: [["TOTE-U", "Taille unique", "Écru", 40]] },
      { slug: "vinyle-echo", name: "Vinyle — Echo", cat: "Musique", price: 20000,
        desc: "Édition limitée vinyle de l'album Echo.",
        en: { name: "Vinyl — Echo", description: "Limited vinyl edition of the Echo album." },
        variants: [["VIN-ECHO", "33 tours", "", 15]] },
    ];
    const variantByProduct = {};
    let pr = 0;
    for (const p of products) {
      const cover = await addMedia(img(`product-${p.slug}`, 1000, 1000), p.name, 1000, 1000);
      const prod = await one(
        `INSERT INTO products (slug, name, description, category, base_price_xaf, cover_media_id, status, sort_order, i18n)
         VALUES ($1,$2,$3,$4,$5,$6,'published',$7,$8::jsonb) RETURNING id`,
        [p.slug, p.name, p.desc, p.cat, p.price, cover, pr++, JSON.stringify({ en: p.en })],
      );
      // galerie : 2 images
      for (let g = 0; g < 2; g++) {
        const m = await addMedia(img(`product-${p.slug}-g${g}`, 1000, 1000), p.name, 1000, 1000);
        await c.query("INSERT INTO product_images (product_id, media_id, sort_order) VALUES ($1,$2,$3)", [prod.id, m, g]);
      }
      variantByProduct[p.slug] = [];
      let vi = 0;
      for (const [sku, size, color, stock] of p.variants) {
        const v = await one(
          `INSERT INTO product_variants (product_id, sku, option_size, option_color, price_xaf, stock, status, sort_order)
           VALUES ($1,$2,$3,$4,NULL,$5,'active',$6) RETURNING id`,
          [prod.id, sku, size, color, stock, vi++],
        );
        variantByProduct[p.slug].push({ id: v.id, sku, size, color, price: p.price, name: p.name });
      }
    }

    /* ------------------------------ Commandes ---------------------------- */
    const mkOrder = async (customer, phone, lines, orderStatus, paymentStatus) => {
      let subtotal = 0;
      const items = lines.map(({ v, qty }) => {
        const lineTotal = v.price * qty;
        subtotal += lineTotal;
        return { v, qty, lineTotal };
      });
      const reference = ref();
      const order = await one(
        `INSERT INTO orders (reference, lookup_token_hash, customer_name, customer_phone, customer_note,
           whatsapp_snapshot, subtotal_xaf, total_xaf, order_status, payment_status, confirmed_at)
         VALUES ($1,$2,$3,$4,'',$5,$6,$7,$8,$9, CASE WHEN $8 <> 'pending' THEN now() ELSE NULL END) RETURNING id`,
        [reference, sha256(randomBytes(16).toString("hex")), customer, phone, "237600000000", subtotal, subtotal, orderStatus, paymentStatus],
      );
      for (const { v, qty, lineTotal } of items) {
        const label = [v.size, v.color].filter(Boolean).join(" / ") || "Standard";
        await c.query(
          `INSERT INTO order_items (order_id, product_variant_id, product_name, variant_label, sku, unit_price_xaf, quantity, line_total_xaf)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [order.id, v.id, v.name, label, v.sku, v.price, qty, lineTotal],
        );
        await c.query("UPDATE product_variants SET stock = stock - $1 WHERE id = $2 AND stock >= $1", [qty, v.id]);
      }
    };
    await mkOrder("Awa Ngono", "237690000001", [{ v: variantByProduct["tshirt-signature"][1], qty: 2 }], "pending", "unpaid");
    await mkOrder("Jean Fotso", "237690000002", [
      { v: variantByProduct["hoodie-arkane"][0], qty: 1 },
      { v: variantByProduct["casquette"][0], qty: 1 },
    ], "confirmed", "paid");

    /* ------------------------------ Messages ----------------------------- */
    const messages = [
      ["Marie Kom", "marie@example.com", "237690000010", "Demande de devis clip", "Bonjour, je souhaite un devis pour un clip. Merci."],
      ["Studio XYZ", "", "237690000011", "Collaboration", "Nous aimerions discuter d'une collaboration sur un album."],
      ["Paul N.", "paul@example.com", "", "Question mixage", "Proposez-vous le mixage à distance ?"],
    ];
    let mi = 0;
    for (const [name, email, phone, subject, message] of messages) {
      await c.query(
        `INSERT INTO contact_messages (name, email, phone, subject, message, status, created_at)
         VALUES ($1, NULLIF($2,''), NULLIF($3,''), $4, $5, $6, now() - ($7 || ' hours')::interval)`,
        [name, email, phone, subject, message, mi === 0 ? "new" : "read", String(mi * 5)],
      );
      mi++;
    }

    /* ------------------------------ Équipe ------------------------------- */
    const members = [
      { name: "Arsène Mbida", role: "Fondateur · Directeur artistique",
        bio: "Visionnaire du studio, Arsène guide chaque projet de l'intention à la finition.",
        en: { roleTitle: "Founder · Art director", bio: "The studio's visionary, Arsène guides every project from intention to finish." } },
      { name: "Clarisse Eyenga", role: "Ingénieure du son",
        bio: "Oreille exigeante, Clarisse sculpte le son avec précision.",
        en: { roleTitle: "Sound engineer", bio: "A demanding ear, Clarisse sculpts sound with precision." } },
      { name: "David Owona", role: "Réalisateur",
        bio: "Caméra à l'épaule, David traduit la musique en images.",
        en: { roleTitle: "Director", bio: "Camera on shoulder, David turns music into images." } },
      { name: "Lena Tchoumi", role: "Cheffe de projet",
        bio: "Elle orchestre les plannings et garde le cap sur chaque production.",
        en: { roleTitle: "Project lead", bio: "She orchestrates schedules and keeps every production on course." } },
    ];
    let ti = 0;
    for (const m of members) {
      const photo = await addMedia(img(`team-${ti}`, 800, 1000), m.name, 800, 1000);
      await c.query(
        `INSERT INTO team_members (name, role_title, bio, photo_media_id, status, sort_order, i18n)
         VALUES ($1,$2,$3,$4,'published',$5,$6::jsonb)`,
        [m.name, m.role, m.bio, photo, ti++, JSON.stringify({ en: m.en })],
      );
    }

    /* ------------------------------ Paramètres --------------------------- */
    const studioRules = [
      { fr: "Servir la vision de l'artiste avant tout.", en: "Serve the artist's vision above all." },
      { fr: "L'exigence à chaque étape, sans compromis.", en: "Demand excellence at every step, no compromise." },
      { fr: "Le détail fait l'œuvre.", en: "The detail makes the work." },
      { fr: "Rien ne remplace le travail.", en: "Nothing replaces the work." },
      { fr: "L'Arkane vaincra.", en: "Arkane will prevail." },
    ];
    const studioHistory =
      "Né d'une passion commune pour le son et l'image, Arkane Production a grandi au cœur de la scène camerounaise. Du home-studio des débuts à un lieu de création complet, nous avons gardé la même obsession : la qualité.";
    const studioHistoryEn =
      "Born from a shared passion for sound and image, Arkane Production grew in the heart of the Cameroonian scene. From an early home-studio to a full creative space, we kept the same obsession: quality.";
    const studioVision =
      "Faire d'Arkane une référence de la production africaine — un studio où les artistes trouvent les moyens de leurs ambitions, sans quitter le continent.";
    const studioVisionEn =
      "To make Arkane a benchmark of African production — a studio where artists find the means to match their ambitions, without leaving the continent.";
    const og = await addMedia(img("arkane-og", 1200, 630), "Arkane Production", 1200, 630);
    await c.query(
      `UPDATE site_settings SET
         studio_name = 'Arkane Production',
         tagline = 'Studio de production musicale & audiovisuelle',
         description = 'Arkane Production accompagne artistes et marques, de la création musicale à la réalisation audiovisuelle.',
         contact_email = 'contact@arkane.cm',
         contact_phone = '+237 6 00 00 00 00',
         whatsapp_number = '237600000000',
         address = 'Yaoundé, Cameroun',
         social_instagram = 'https://instagram.com/',
         social_youtube = 'https://youtube.com/',
         social_facebook = 'https://facebook.com/',
         social_tiktok = 'https://tiktok.com/',
         social_x = 'https://x.com/',
         social_spotify = 'https://open.spotify.com/',
         seo_default_title = 'Arkane Production',
         seo_default_desc = 'Studio de production musicale et audiovisuelle basé au Cameroun.',
         og_image_media_id = $1,
         studio_history = $3,
         studio_vision = $4,
         studio_rules = $5::jsonb,
         i18n = $2::jsonb
       WHERE id = 1`,
      [
        og,
        JSON.stringify({
          en: {
            tagline: "Music & audiovisual production studio",
            description: "Arkane Production supports artists and brands, from music creation to audiovisual production.",
            seoDefaultTitle: "Arkane Production",
            seoDefaultDesc: "Music and audiovisual production studio based in Cameroon.",
            studioHistory: studioHistoryEn,
            studioVision: studioVisionEn,
          },
        }),
        studioHistory,
        studioVision,
        JSON.stringify(studioRules),
      ],
    );

    await c.query("COMMIT");
    console.log(
      `✓ Données de test insérées : ${artists.length} artistes, ${members.length} membres d'équipe, ${projects.length} productions, ${services.length} services, ${products.length} produits, 2 commandes, ${messages.length} messages, studio (histoire/vision/règles) + paramètres mis à jour.`,
    );
    console.log("  Images : placeholders gris (picsum.photos). Remplacez-les par vos vrais médias dans l'admin.");
  } catch (err) {
    await c.query("ROLLBACK");
    throw err;
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n✖ Erreur de seed :", err?.message ?? err);
  process.exit(1);
});
