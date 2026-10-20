-- Ajoute le lien TikTok aux artistes.
ALTER TABLE artists ADD COLUMN social_tiktok text NOT NULL DEFAULT '';
