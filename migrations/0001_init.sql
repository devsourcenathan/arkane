-- =============================================================================
-- Arkane Production — Schéma initial (PostgreSQL / Neon)
-- Montants monétaires : entiers en XAF (FCFA). Jamais de décimales.
-- Identifiants : UUID (gen_random_uuid, natif Postgres >= 13).
-- Statuts : contraints par CHECK. Clés étrangères + index explicites.
-- =============================================================================

-- --- Fonction utilitaire : maintien automatique de updated_at ---------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Administration
-- =============================================================================
CREATE TABLE admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  password_hash text NOT NULL,
  display_name  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX admin_users_email_key ON admin_users (lower(email));

CREATE TRIGGER admin_users_updated BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE admin_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  token_hash    text NOT NULL,
  csrf_secret   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz,
  ip            text,
  user_agent    text
);
CREATE UNIQUE INDEX admin_sessions_token_key ON admin_sessions (token_hash);
CREATE INDEX admin_sessions_user_idx ON admin_sessions (admin_user_id);
CREATE INDEX admin_sessions_expires_idx ON admin_sessions (expires_at);

-- =============================================================================
-- Paramètres du site (ligne unique)
-- =============================================================================
CREATE TABLE site_settings (
  id                   smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  studio_name          text NOT NULL DEFAULT 'Arkane Production',
  tagline              text NOT NULL DEFAULT '',
  description          text NOT NULL DEFAULT '',
  contact_email        text NOT NULL DEFAULT '',
  contact_phone        text NOT NULL DEFAULT '',
  whatsapp_number      text NOT NULL DEFAULT '',   -- format international sans "+", ex: 2376XXXXXXXX
  address              text NOT NULL DEFAULT '',
  social_instagram     text NOT NULL DEFAULT '',
  social_youtube       text NOT NULL DEFAULT '',
  social_facebook      text NOT NULL DEFAULT '',
  social_tiktok        text NOT NULL DEFAULT '',
  social_x             text NOT NULL DEFAULT '',
  social_spotify       text NOT NULL DEFAULT '',
  theme                text NOT NULL DEFAULT 'dark'    CHECK (theme IN ('dark', 'light')),
  palette              text NOT NULL DEFAULT 'default' CHECK (palette IN ('default', 'ink')),
  seo_default_title    text NOT NULL DEFAULT 'Arkane Production',
  seo_default_desc     text NOT NULL DEFAULT '',
  og_image_media_id    uuid,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER site_settings_updated BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Médias (métadonnées uniquement ; le binaire vit dans R2)
-- =============================================================================
CREATE TABLE media (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  r2_key       text NOT NULL,
  filename     text NOT NULL,
  content_type text NOT NULL,
  size_bytes   integer NOT NULL CHECK (size_bytes >= 0),
  width        integer,
  height       integer,
  alt          text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX media_r2_key_key ON media (r2_key);
CREATE INDEX media_created_idx ON media (created_at DESC);

-- La référence OG du site pointe vers un média (nullable, SET NULL si supprimé).
ALTER TABLE site_settings
  ADD CONSTRAINT site_settings_og_media_fk
  FOREIGN KEY (og_image_media_id) REFERENCES media (id) ON DELETE SET NULL;

-- =============================================================================
-- Artistes
-- =============================================================================
CREATE TABLE artists (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text NOT NULL,
  name               text NOT NULL,
  role_title         text NOT NULL DEFAULT '',
  bio                text NOT NULL DEFAULT '',
  portrait_media_id  uuid REFERENCES media (id) ON DELETE SET NULL,
  social_instagram   text NOT NULL DEFAULT '',
  social_youtube     text NOT NULL DEFAULT '',
  social_spotify     text NOT NULL DEFAULT '',
  social_apple_music text NOT NULL DEFAULT '',
  social_x           text NOT NULL DEFAULT '',
  status             text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order         integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX artists_slug_key ON artists (slug);
CREATE INDEX artists_status_idx ON artists (status, sort_order);

CREATE TRIGGER artists_updated BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Productions (projets)
-- =============================================================================
CREATE TABLE projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL,
  title           text NOT NULL,
  category        text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  cover_media_id  uuid REFERENCES media (id) ON DELETE SET NULL,
  video_url       text NOT NULL DEFAULT '',
  release_date    date,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured        boolean NOT NULL DEFAULT false,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX projects_slug_key ON projects (slug);
CREATE INDEX projects_status_idx ON projects (status, sort_order);
CREATE INDEX projects_category_idx ON projects (category);
CREATE INDEX projects_featured_idx ON projects (featured) WHERE featured = true;

CREATE TRIGGER projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Association N..N productions <-> artistes
CREATE TABLE project_artists (
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  artist_id  uuid NOT NULL REFERENCES artists (id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, artist_id)
);
CREATE INDEX project_artists_artist_idx ON project_artists (artist_id);

-- =============================================================================
-- Services
-- =============================================================================
CREATE TABLE services (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL,
  title           text NOT NULL,
  summary         text NOT NULL DEFAULT '',
  description     text NOT NULL DEFAULT '',
  price_from_xaf  integer CHECK (price_from_xaf IS NULL OR price_from_xaf >= 0),
  price_note      text NOT NULL DEFAULT '',
  cover_media_id  uuid REFERENCES media (id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX services_slug_key ON services (slug);
CREATE INDEX services_status_idx ON services (status, sort_order);

CREATE TRIGGER services_updated BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Produits (merchandising) + variantes
-- =============================================================================
CREATE TABLE products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  category        text NOT NULL DEFAULT '',
  base_price_xaf  integer NOT NULL CHECK (base_price_xaf >= 0),
  cover_media_id  uuid REFERENCES media (id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX products_slug_key ON products (slug);
CREATE INDEX products_status_idx ON products (status, sort_order);
CREATE INDEX products_category_idx ON products (category);

CREATE TRIGGER products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE product_images (
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  media_id   uuid NOT NULL REFERENCES media (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, media_id)
);

CREATE TABLE product_variants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  sku          text NOT NULL,
  option_size  text NOT NULL DEFAULT '',
  option_color text NOT NULL DEFAULT '',
  price_xaf    integer CHECK (price_xaf IS NULL OR price_xaf >= 0), -- NULL => hérite base_price_xaf
  stock        integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX product_variants_sku_key ON product_variants (sku);
CREATE INDEX product_variants_product_idx ON product_variants (product_id);

CREATE TRIGGER product_variants_updated BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Commandes + lignes de commande (snapshots immuables)
-- =============================================================================
CREATE TABLE orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference          text NOT NULL,            -- ex: ARK-7F3K9Q2M (non prédictible)
  lookup_token_hash  text NOT NULL,            -- hash du jeton de consultation publique
  customer_name      text NOT NULL,
  customer_phone     text NOT NULL,
  customer_email     text,
  customer_note      text NOT NULL DEFAULT '',
  whatsapp_snapshot  text NOT NULL DEFAULT '', -- numéro WhatsApp au moment de la commande
  currency           text NOT NULL DEFAULT 'XAF',
  subtotal_xaf       integer NOT NULL CHECK (subtotal_xaf >= 0),
  total_xaf          integer NOT NULL CHECK (total_xaf >= 0),
  order_status       text NOT NULL DEFAULT 'pending'
                       CHECK (order_status IN ('pending', 'confirmed', 'fulfilled', 'cancelled')),
  payment_status     text NOT NULL DEFAULT 'unpaid'
                       CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  stock_released     boolean NOT NULL DEFAULT false, -- stock remis en rayon (annulation)
  internal_notes     text NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  confirmed_at       timestamptz,
  cancelled_at       timestamptz
);
CREATE UNIQUE INDEX orders_reference_key ON orders (reference);
CREATE INDEX orders_status_idx ON orders (order_status, created_at DESC);
CREATE INDEX orders_payment_idx ON orders (payment_status);
CREATE INDEX orders_created_idx ON orders (created_at DESC);

CREATE TRIGGER orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE order_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_variant_id uuid REFERENCES product_variants (id) ON DELETE SET NULL,
  product_name       text NOT NULL,  -- snapshot
  variant_label      text NOT NULL DEFAULT '', -- snapshot (ex: "L / Noir")
  sku                text NOT NULL,  -- snapshot
  unit_price_xaf     integer NOT NULL CHECK (unit_price_xaf >= 0), -- snapshot
  quantity           integer NOT NULL CHECK (quantity > 0),
  line_total_xaf     integer NOT NULL CHECK (line_total_xaf >= 0)
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

-- =============================================================================
-- Messages de contact
-- =============================================================================
CREATE TABLE contact_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text,
  phone      text,
  subject    text NOT NULL,
  message    text NOT NULL,
  status     text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  ip         text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);
CREATE INDEX contact_messages_status_idx ON contact_messages (status, created_at DESC);

-- =============================================================================
-- Limitation de débit (durable, inter-isolats)
-- =============================================================================
CREATE TABLE rate_limits (
  bucket     text PRIMARY KEY,
  count      integer NOT NULL DEFAULT 0,
  reset_at   timestamptz NOT NULL
);
CREATE INDEX rate_limits_reset_idx ON rate_limits (reset_at);
