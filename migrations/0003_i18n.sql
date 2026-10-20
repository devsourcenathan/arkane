-- =============================================================================
-- Internationalisation du contenu (FR par défaut dans les colonnes de base,
-- traductions stockées dans une colonne JSONB `i18n`).
-- Forme : { "en": { "title": "...", "description": "..." }, ... }
-- Une valeur de traduction vide retombe sur la colonne de base (français).
-- =============================================================================

ALTER TABLE site_settings ADD COLUMN i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE artists       ADD COLUMN i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE projects      ADD COLUMN i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE services      ADD COLUMN i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products      ADD COLUMN i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
