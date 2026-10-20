-- =============================================================================
-- Contenu "Studio" : histoire, vision, règles, et équipe (membres).
-- =============================================================================

-- Textes éditoriaux du studio (traductions dans site_settings.i18n).
ALTER TABLE site_settings ADD COLUMN studio_history text NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN studio_vision  text NOT NULL DEFAULT '';
-- Les 5 règles : tableau d'objets { "fr": "...", "en": "..." }.
ALTER TABLE site_settings ADD COLUMN studio_rules   jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Membres de l'équipe.
CREATE TABLE team_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  role_title     text NOT NULL DEFAULT '',
  bio            text NOT NULL DEFAULT '',
  photo_media_id uuid REFERENCES media (id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order     integer NOT NULL DEFAULT 0,
  i18n           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX team_members_status_idx ON team_members (status, sort_order);

CREATE TRIGGER team_members_updated BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
