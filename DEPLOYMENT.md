# Mise en production — Arkane Production

Guide pas-à-pas pour déployer le site sur **Cloudflare Workers** (API + frontend),
avec **Neon** (PostgreSQL), **R2** (médias) et **Turnstile** (anti-robot).

> Vous êtes sous Windows : les commandes sont données pour **PowerShell**. L'équivalent
> bash/macOS/Linux est indiqué quand la syntaxe diffère.

---

## 0. Vue d'ensemble (ce qu'on va faire)

1. Préparer les comptes (Cloudflare + R2 activé, Neon).
2. Choisir la base de **production** (séparée des données de test).
3. Se connecter à Cloudflare (`wrangler login`).
4. Créer les buckets R2.
5. Définir les **secrets** de production (`wrangler secret put ...`).
6. Régler les **variables publiques** (domaine, etc.).
7. Appliquer les **migrations** sur la base de prod + créer l'admin de prod.
8. **Builder et déployer** (`npm run deploy`).
9. Brancher le **domaine** + configurer Turnstile dessus.
10. Vérifier, puis gérer les **mises à jour**.

Durée : ~30–45 min la première fois.

---

## 1. Prérequis

- **Compte Cloudflare** avec **R2 activé** (R2 nécessite d'être activé dans le dashboard,
  menu *R2* → *Enable* ; une carte peut être demandée, il existe un palier gratuit de 10 Go).
- **Compte Neon** (déjà créé). On va créer une base de **production** distincte (étape 2).
- **Node.js ≥ 20** et le dépôt cloné en local (déjà le cas).
- Dépendances installées :

```bash
npm install
```

---

## 2. Base de données de production (Neon)

⚠️ Votre base actuelle (`neondb`) contient des **données de test** (seed). Ne déployez pas
la prod dessus telle quelle. Deux options propres :

**Option A — Base de prod dédiée (recommandé)**
1. Dans Neon → votre projet → créez une **nouvelle base** (ou un nouveau projet) nommée p. ex. `arkane_prod`.
2. Copiez sa **chaîne de connexion** (avec `?sslmode=require`).

**Option B — Branche Neon**
1. Dans Neon → *Branches* → créez une branche `production` (donnée vierge ou copie).
2. Copiez la chaîne de connexion de cette branche.

Gardez cette chaîne de côté : on l'appellera **`DATABASE_URL` de prod**.
> On n'exécute **pas** `npm run seed` en production — vous ajouterez votre vrai contenu via l'admin.

---

## 3. Connexion à Cloudflare

```bash
npx wrangler login
```

Cela ouvre le navigateur pour autoriser Wrangler. Vérifiez :

```bash
npx wrangler whoami
```

---

## 4. Créer les buckets R2

Le projet attend deux buckets (voir `wrangler.jsonc` → `r2_buckets`) :

```bash
npx wrangler r2 bucket create arkane-media
npx wrangler r2 bucket create arkane-media-preview
```

- `arkane-media` : bucket de production (médias uploadés depuis l'admin).
- `arkane-media-preview` : utilisé par `wrangler dev`/preview.

> Si la commande échoue avec « R2 not enabled », activez R2 dans le dashboard Cloudflare d'abord.

---

## 5. Secrets de production

Les secrets ne vont **jamais** dans le code. On les pousse via Wrangler (stockés chiffrés chez Cloudflare) :

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put SESSION_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
```

Pour chaque commande, Wrangler demande la valeur :

| Secret | Valeur à coller |
|--------|-----------------|
| `DATABASE_URL` | la chaîne Neon de **prod** (étape 2) |
| `SESSION_SECRET` | une clé aléatoire forte (voir ci-dessous) |
| `TURNSTILE_SECRET_KEY` | votre **secret key** Turnstile réelle (`0x4AAAAA…`) |

Générer un `SESSION_SECRET` fort :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> Utilisez un `SESSION_SECRET` **différent** de celui de dev.

---

## 6. Variables publiques (non secrètes)

### a) Côté serveur — `wrangler.jsonc` → `vars`

Éditez [`wrangler.jsonc`](wrangler.jsonc) et mettez vos valeurs :

```jsonc
"vars": {
  "APP_ENV": "production",
  "PUBLIC_BASE_URL": "https://votre-domaine.com",   // domaine final (sitemap, Open Graph)
  "PUBLIC_MEDIA_BASE_URL": ""                         // vide = médias servis via le Worker (OK)
}
```

- `PUBLIC_BASE_URL` : indispensable pour des URLs correctes (sitemap, partages). Mettez le
  domaine réel. Si vous n'avez pas encore de domaine, utilisez l'URL `*.workers.dev`
  (visible après le 1er déploiement) puis mettez à jour.
- `PUBLIC_MEDIA_BASE_URL` : laissez vide pour commencer (les images passent par
  `/api/v1/media/...`). Voir l'étape 9c pour un domaine R2 dédié (optionnel, perf).

### b) Côté client — `.env` (clé Turnstile publique)

Le frontend lit la **site key** Turnstile **au moment du build** depuis `.env` :

```
VITE_TURNSTILE_SITE_KEY="0x4AAAAAAFdfI2UjO0Eiz5Dg"
```

⚠️ La site key (`.env`) et la secret key (étape 5) doivent provenir **du même widget**
Turnstile. `.env` est déjà rempli en local ; vérifiez juste que c'est la bonne clé de prod.

---

## 7. Migrations + admin sur la base de PROD

On pointe temporairement les scripts vers la **base de prod** (via la variable d'environnement,
qui est prioritaire sur `.dev.vars`).

**PowerShell :**

```bash
$env:DATABASE_URL="postgresql://...votre-base-de-prod...?sslmode=require"
npm run migrate
node scripts/create-admin.mjs --email admin@votre-domaine.com
Remove-Item Env:\DATABASE_URL
```

**bash/macOS/Linux :**

```bash
DATABASE_URL="postgresql://...prod..." npm run migrate
DATABASE_URL="postgresql://...prod..." node scripts/create-admin.mjs --email admin@votre-domaine.com
```

- `npm run migrate` crée toutes les tables sur la base de prod.
- `create-admin` génère et **affiche une fois** un mot de passe admin — notez-le.
  (ou ajoutez `--password "votreMotDePasse"`).
- Ne lancez **pas** `npm run seed` en prod.

> Vérifier l'état des migrations : `npm run migrate:status` (avec le même `DATABASE_URL`).

---

## 8. Build + déploiement

```bash
npm run deploy
```

Cette commande fait `tsc -b && vite build` (frontend + Worker) puis `wrangler deploy`.
À la fin, Wrangler affiche l'URL du Worker, du type :

```
https://arkane-production.<votre-compte>.workers.dev
```

Ouvrez-la : le site doit s'afficher. `/<domaine>/api/v1/health` doit répondre `{"ok":true,...}`.

---

## 9. Domaine, Turnstile, médias

### a) Domaine personnalisé
Dashboard Cloudflare → *Workers & Pages* → votre Worker `arkane-production` → *Settings* →
*Domains & Routes* → **Add Custom Domain** (ex. `arkane.cm` ou `www.arkane.cm`).
Puis mettez `PUBLIC_BASE_URL` à jour (étape 6a) et redéployez (`npm run deploy`).

### b) Turnstile — autoriser le domaine
Dashboard Cloudflare → *Turnstile* → votre widget → ajoutez le **domaine de prod** dans les
*Hostnames* autorisés (sinon la vérification échoue sur les formulaires).

### c) (Optionnel) Médias R2 via domaine public
Par défaut, les images passent par le Worker (`/api/v1/media/...`) — ça marche.
Pour de meilleures perfs/cache, exposez le bucket :
Dashboard → *R2* → `arkane-media` → *Settings* → *Public access* / *Custom domain*
(ex. `media.arkane.cm`). Puis mettez `PUBLIC_MEDIA_BASE_URL` = `https://media.arkane.cm`
(étape 6a) et redéployez.

---

## 10. Après le déploiement — à faire dans l'admin

Connectez-vous sur `https://votre-domaine.com/admin` :

1. **Changez le mot de passe admin** si généré automatiquement.
2. **Paramètres** → renseignez : **numéro WhatsApp** (format `2376XXXXXXXX`), coordonnées,
   liens sociaux, histoire/vision/règles du studio, SEO, image Open Graph.
3. Ajoutez votre **vrai contenu** : artistes, productions, services, produits, équipe,
   en **téléversant vos médias** (ils iront dans R2).

### Vérifications
- Page d'accueil, productions, artistes, services, boutique s'affichent.
- Bascule **FR/EN**.
- **Formulaire de contact** : le widget Turnstile apparaît et l'envoi réussit.
- **Commande** : ajouter au panier → commande → bouton WhatsApp pré-rempli.
- **Admin** : commandes et messages remontent ; confirmation manuelle de paiement OK.

---

## 11. Mises à jour ultérieures

- **Nouveau code** : `npm run deploy`.
- **Nouvelle migration** (si le schéma évolue) : rejouez l'étape 7 (`npm run migrate` avec le
  `DATABASE_URL` de prod) **avant ou après** le deploy selon le changement.
- **Rotation d'un secret** : `npx wrangler secret put <NOM>`.

---

## 12. Dépannage (erreurs fréquentes)

| Symptôme | Cause / solution |
|----------|------------------|
| `R2 not enabled` à la création du bucket | Activez R2 dans le dashboard Cloudflare. |
| `DATABASE_URL manquant` aux migrations | La variable d'env n'est pas définie dans le shell (étape 7). |
| Formulaires : « Échec de la vérification anti-robot » | Site key (`.env`) et secret key (wrangler) pas du même widget, ou domaine non autorisé dans Turnstile (étape 9b). |
| `ERR_RUNTIME_FAILURE` / compatibility date | En prod ce n'est normalement pas un souci ; `compatibility_date` est dans `wrangler.jsonc`. |
| Les images ne s'affichent pas | Bucket R2 non créé/non lié, ou média non téléversé. Vérifiez le binding `MEDIA` dans `wrangler.jsonc`. |
| Erreurs de connexion Neon | Vérifiez la chaîne (`?sslmode=require`) ; en cas de souci WebSocket, retirez `channel_binding=require`. |

---

## Récapitulatif des valeurs à préparer

| Élément | Où | Exemple |
|--------|-----|---------|
| `DATABASE_URL` (prod) | `wrangler secret` + migrations | `postgresql://…neon.tech/arkane_prod?sslmode=require` |
| `SESSION_SECRET` | `wrangler secret` | aléatoire 48 octets |
| `TURNSTILE_SECRET_KEY` | `wrangler secret` | `0x4AAAAA…` |
| `VITE_TURNSTILE_SITE_KEY` | `.env` (build) | `0x4AAAAA…` |
| `PUBLIC_BASE_URL` | `wrangler.jsonc` → vars | `https://arkane.cm` |
| Buckets R2 | `wrangler r2 bucket create` | `arkane-media`, `arkane-media-preview` |
| Admin prod | `scripts/create-admin.mjs` | `admin@arkane.cm` |
