-- =============================================================================
-- Insère la ligne unique de paramètres du site (si absente).
-- Valeurs volontairement neutres / vides : les coordonnées officielles, le
-- numéro WhatsApp et les liens sociaux sont à renseigner dans l'administration.
-- =============================================================================
INSERT INTO site_settings (id, studio_name, tagline, description, seo_default_desc)
VALUES (
  1,
  'Arkane Production',
  'Studio de production musicale & audiovisuelle',
  'Arkane Production accompagne artistes et marques, de la création musicale à la réalisation audiovisuelle.',
  'Arkane Production — studio de production musicale et audiovisuelle basé au Cameroun.'
)
ON CONFLICT (id) DO NOTHING;
