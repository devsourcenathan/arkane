# Arkane Production — Site web

Site web complet (frontend + API + administration) pour **Arkane Production**, studio de
production musicale et audiovisuelle basé au Cameroun.

Application unique déployée sur **Cloudflare Workers** : l'API REST et le frontend React (SPA)
sont servis par le même worker. Les données relationnelles vivent sur **Neon (PostgreSQL)**, les
médias sur **Cloudflare R2**, et les formulaires publics sont protégés par **Cloudflare Turnstile**.

---

## Sommaire

- [Pile technique](#pile-technique)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Variables d'environnement & secrets](#variables-denvironnement--secrets)
- [Base de données (Neon)](#base-de-données-neon)
- [Premier compte administrateur](#premier-compte-administrateur)
- [Développement](#développement)
- [Tests, lint, build](#tests-lint-build)
- [Système de design & thèmes](#système-de-design--thèmes)
- [Déploiement Cloudflare](#déploiement-cloudflare)
- [Actions manuelles (tableau de bord Cloudflare)](#actions-manuelles-tableau-de-bord-cloudflare)
- [Sécurité](#sécurité)
- [Structure du projet](#structure-du-projet)
- [Limites connues](#limites-connues)

---

## Pile technique

| Domaine     | Technologie |
|-------------|-------------|
| Frontend    | React 18, TypeScript (strict), Vite 6, Tailwind CSS 3, React Router 6 |
| Backend     | Cloudflare Workers, Hono 4, Zod |
| Base        | Neon (PostgreSQL) via `@neondatabase/serverless` |
| Médias      | Cloudflare R2 |
| Anti-robot  | Cloudflare Turnstile |
| Build/deploy| Vite + `@cloudflare/vite-plugin` + Wrangler |
| Tests       | Vitest, Testing Library |

> **Note d'architecture.** Le cahier des charges initial prévoyait Cloudflare D1. À la demande du
> commanditaire, la base relationnelle est hébergée sur **Neon (PostgreSQL)**. C'est la seule
> dépendance hors Cloudflare ; R2, Turnstile et le worker restent sur Cloudflare.

---

## Prérequis

- **Node.js ≥ 20** (développé et testé avec Node 22+).
- Un compte **Cloudflare** (Workers + R2 + Turnstile).
- Un projet **Neon** (PostgreSQL) — l'offre gratuite suffit.

---

## Installation

```bash
npm install
```

Copiez les fichiers d'exemple de configuration :

```bash
cp .dev.vars.example .dev.vars
cp .env.example .env
```

Puis renseignez les valeurs (voir ci-dessous).

---

## Variables d'environnement & secrets

### `.dev.vars` (secrets serveur, développement local — jamais committé)

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | Chaîne de connexion Neon (avec `?sslmode=require`). |
| `SESSION_SECRET` | Clé aléatoire (≥ 32 octets) pour les sessions admin. |
| `TURNSTILE_SECRET_KEY` | Clé secrète Turnstile (clé de test fournie par défaut). |

Générer un `SESSION_SECRET` :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### `.env` (exposé au frontend au build — non secret)

| Variable | Rôle |
|----------|------|
| `VITE_TURNSTILE_SITE_KEY` | Clé publique Turnstile (clé de test fournie par défaut). |

### `wrangler.jsonc > vars` (publiques, en production)

| Variable | Rôle |
|----------|------|
| `APP_ENV` | `production` ou `development` (pilote le flag `Secure` des cookies). |
| `PUBLIC_BASE_URL` | URL publique du site (sitemap, Open Graph). |
| `PUBLIC_MEDIA_BASE_URL` | Préfixe public des médias R2 (vide = proxy via le worker). |

En **production**, les secrets se définissent via Wrangler (voir [Déploiement](#déploiement-cloudflare)).

---

## Base de données (Neon)

1. Créez un projet sur [neon.tech](https://neon.tech) et copiez la chaîne de connexion
   (format : `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`).
2. Collez-la dans `DATABASE_URL` (dans `.dev.vars`).
3. Appliquez les migrations :

```bash
npm run migrate          # applique les migrations en attente
npm run migrate:status   # liste appliquées / en attente
```

Les migrations versionnées se trouvent dans [`migrations/`](migrations/). Elles créent toutes les
tables (`admin_users`, `admin_sessions`, `site_settings`, `media`, `artists`, `projects`,
`project_artists`, `services`, `products`, `product_variants`, `product_images`, `orders`,
`order_items`, `contact_messages`, `rate_limits`) avec contraintes, clés étrangères et index.

### Données de test (optionnel)

Pour peupler la base avec un jeu de données de démonstration (artistes, productions, services,
produits + variantes, 2 commandes, 3 messages, paramètres, et des images grises de placeholder) :

```bash
npm run seed
```

⚠️ Ré-exécutable : vide d'abord le contenu, les commandes et les messages, puis réinsère. Ne
touche pas aux comptes administrateurs. Remplacez ensuite les images de démo par vos vrais médias
dans l'administration.

---

## Premier compte administrateur

Aucun endpoint public d'inscription n'existe. Créez l'administrateur via le script sécurisé :

```bash
# mot de passe fourni
node scripts/create-admin.mjs --email admin@arkane.cm --password "unMotDePasseFort"

# ou mot de passe généré et affiché une seule fois
node scripts/create-admin.mjs --email admin@arkane.cm

# ou via variables d'environnement (CI)
ADMIN_EMAIL=admin@arkane.cm ADMIN_PASSWORD=... node scripts/create-admin.mjs
```

Le mot de passe est haché (PBKDF2-HMAC-SHA256, 120 000 itérations). Connexion ensuite sur `/admin`.

---

## Développement

```bash
npm run dev
```

Démarre Vite + le worker dans le runtime Cloudflare (Miniflare). Le site est sur
`http://localhost:5173`, l'API sous `/api/v1`, l'administration sur `/admin`.

> En local, R2 et les sessions sont simulés par Miniflare. Turnstile accepte la clé de test.

---

## Tests, lint, build

```bash
npm test         # tests unitaires (Vitest)
npm run lint     # ESLint
npm run build    # typecheck strict + build de production (client + worker)
```

Les tests couvrent notamment : calcul du total côté serveur (prix client ignoré), refus de stock
insuffisant, snapshots de commande, compatibilité du hachage worker ↔ script, validation Zod
(contact / commande / paramètres), formatage XAF, slugs, et rendu de composants.

---

## Système de design & thèmes

Toutes les couleurs sont des **variables CSS** centralisées dans
[`src/styles/tokens.css`](src/styles/tokens.css) et consommées par Tailwind via des tokens
sémantiques (`bg`, `surface`, `fg`, `border`, `btn-*`, …). **Aucun composant ne référence une
couleur en dur.**

- Palette par défaut : **strictement monochrome** (noir / blanc / gris neutres).
- Changer toute l'identité chromatique = éditer `tokens.css`.
- Thèmes `dark` (défaut) et `light`, plus une palette alternative `ink`
  ([`src/styles/themes.css`](src/styles/themes.css)), activables depuis
  **Administration → Paramètres** (validés côté serveur, valeurs autorisées uniquement :
  voir [`shared/theme.ts`](shared/theme.ts)).

---

## Multilingue (FR / EN)

Tout le site est bilingue — **français (par défaut)** et **anglais**.

- **Interface** : un sélecteur FR/EN (mémorisé, applique `<html lang>`), via un provider léger
  ([`src/app/providers/LanguageProvider.tsx`](src/app/providers/LanguageProvider.tsx)). La langue
  est détectée depuis le navigateur au premier passage.
- **Contenu (base de données)** : chaque table de contenu possède une colonne JSONB `i18n`. Le
  français vit dans les colonnes de base ; l'anglais est stocké dans `i18n.en`. L'API localise à la
  volée selon l'en-tête `X-Lang` (un champ anglais vide retombe automatiquement sur le français).
  Voir [`shared/i18n.ts`](shared/i18n.ts).
- **Administration** : chaque formulaire de contenu comporte une section « 🌐 English version »
  pour saisir la traduction (artistes, productions, services, produits, et les paramètres du site :
  accroche, description, SEO).

> Champs volontairement **mono-langues** : les catégories (clés de filtre) et les libellés de
> variantes (taille / couleur). À traduire plus tard si besoin.

---

## Déploiement Cloudflare

1. **Authentifiez Wrangler** : `npx wrangler login`.

2. **Créez le bucket R2** :

```bash
npx wrangler r2 bucket create arkane-media
npx wrangler r2 bucket create arkane-media-preview   # utilisé en dev/preview
```

3. **Définissez les secrets de production** :

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put SESSION_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
```

4. **Ajustez `wrangler.jsonc > vars`** : `PUBLIC_BASE_URL` (domaine réel), éventuellement
   `PUBLIC_MEDIA_BASE_URL`.

5. **Compatibilité date.** `compatibility_date` doit être ≤ la date max supportée par le runtime
   installé. En cas d'erreur `ERR_RUNTIME_FAILURE` au démarrage, abaissez-la d'un jour.

6. **Déployez** :

```bash
npm run deploy    # build + wrangler deploy
```

7. **Migrations en production** : exécutez `npm run migrate` avec `DATABASE_URL` pointant sur la
   base Neon de production, puis créez l'admin de production via `scripts/create-admin.mjs`.

---

## Actions manuelles (tableau de bord Cloudflare)

- **Turnstile** : créer un widget (challenges.cloudflare.com) pour votre domaine. Les deux clés
  vont à deux endroits **différents** :
  - la **site key** (publique) → `VITE_TURNSTILE_SITE_KEY` dans `.env` (lue par le frontend au
    build) ;
  - la **secret key** → `TURNSTILE_SECRET_KEY` dans `.dev.vars` en local et via `wrangler secret`
    en production.
  ⚠️ Les deux clés doivent provenir du **même** widget, sinon la vérification échoue. (Mettre la
  site key dans `.dev.vars` n'a aucun effet : le client ne lit que `.env`.)
- **R2** : créer les buckets ci-dessus. Pour servir les médias via un domaine public (au lieu du
  proxy worker), exposer le bucket via un domaine R2 et renseigner `PUBLIC_MEDIA_BASE_URL`.
- **Neon** : créer la base, autoriser l'accès, copier la connection string.
- **Domaine** : rattacher votre domaine au worker (Workers Routes / Custom Domain) et mettre
  `PUBLIC_BASE_URL` à jour.
- **Paramètres du studio** : une fois connecté à `/admin`, renseigner le **numéro WhatsApp**, les
  coordonnées et les liens sociaux (non pré-remplis volontairement).

---

## Sécurité

- Validation Zod de toutes les entrées, côté serveur.
- Sessions admin : cookie `HttpOnly`, `Secure` en prod, `SameSite=Lax`, jeton haché en base,
  expiration (8 h) et révocation à la déconnexion.
- **CSRF** : jeton de session requis en en-tête `X-CSRF-Token` sur les requêtes mutantes.
- **Rate limiting** durable (table `rate_limits`) sur login, contact et commandes.
- **Turnstile** vérifié côté serveur (fail-closed).
- **Prix et stock calculés côté serveur** : le client n'envoie que `variantId` + `quantité`.
- Décrément de stock **transactionnel** (verrou `FOR UPDATE` + mise à jour conditionnelle).
- Commande créée ≠ payée : le paiement est confirmé **manuellement** par l'admin.
- Référence de commande non prédictible + jeton de consultation haché (aucune donnée d'autrui
  ni note interne exposée publiquement).
- Uploads : types autorisés, taille limitée (8 Mo), vérification des octets d'en-tête, clés R2
  aléatoires, suppression bloquée si le média est utilisé par un contenu publié.
- En-têtes de sécurité (CSP, `X-Content-Type-Options`, `Referrer-Policy`, …) via
  [`public/_headers`](public/_headers).

---

## Structure du projet

```
migrations/            Migrations SQL versionnées (PostgreSQL)
scripts/               migrate.mjs, create-admin.mjs (+ helpers)
shared/                Schémas Zod + types DTO partagés front/back
public/                Assets statiques (_headers, favicon)
src/
  app/                 Routage, layout, providers (settings, panier)
  components/          Composants réutilisables (cartes, UI, médias)
  features/            Pages par domaine (home, productions, artistes,
                       services, merch, contact, admin)
  lib/                 Client API, hooks, SEO, WhatsApp
  styles/              tokens.css, themes.css, global.css
worker/
  routes/              API publique + admin
  middleware/          auth, csrf, erreurs
  services/            logique métier (commandes, auth, médias, turnstile…)
  repositories/        accès données (PostgreSQL)
  lib/                 crypto, slug, http, erreurs
  db/                  client Neon (+ transactions)
```

---

## Limites connues

- **SEO** : les métadonnées (titre, description, Open Graph) sont gérées côté client et un
  `sitemap.xml` dynamique est servi par le worker. Les crawlers exécutant le JS (dont Google) les
  lisent correctement. Pour une garantie sans JS, un pré-rendu statique serait l'étape suivante
  (compatible Cloudflare, sans serveur externe).
- **Dimensions des images** : non extraites à l'upload (`width`/`height` nuls) ; le rendu reste
  correct via le ratio CSS.
- **Multi-admin / rôles** : volontairement hors périmètre (un seul administrateur).
- **Bundle admin** : non découpé en *chunk* séparé (améliorable via lazy-loading des routes admin).
- **Réservation de stock** : le stock est décrémenté à la création de la commande et re-crédité
  uniquement à l'annulation explicite (pas d'expiration automatique de panier dans cette version).

---

🤖 Généré avec [Claude Code](https://claude.com/claude-code)
