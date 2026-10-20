import { useEffect, useState, type FormEvent } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, Spinner } from "@/components/ui/states";
import { AdminHeader } from "../components/common";
import { TextField, TextAreaField, SelectField, FormActions } from "../components/forms";
import { MediaPickerField } from "../components/MediaPicker";
import { TranslationFields } from "../components/TranslationFields";
import { useToast } from "../ToastProvider";
import type { MediaDTO } from "@shared/types";

interface AdminSettings {
  studioName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  address: string;
  socialInstagram: string;
  socialYoutube: string;
  socialFacebook: string;
  socialTiktok: string;
  socialX: string;
  socialSpotify: string;
  theme: string;
  palette: string;
  seoDefaultTitle: string;
  seoDefaultDesc: string;
  ogImageMediaId: string | null;
  ogImage: MediaDTO | null;
  studioHistory: string;
  studioVision: string;
  studioRules: { fr: string; en: string }[];
  i18n?: { en?: Record<string, string> };
}

export function SettingsPage() {
  const { notify } = useToast();
  const { data, loading, error, reload } = useApi(() => api.get<AdminSettings>("/admin/settings"), []);
  const [form, setForm] = useState<AdminSettings | null>(null);
  const [ogImage, setOgImage] = useState<MediaDTO | null>(null);
  const [en, setEn] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(data);
      setOgImage(data.ogImage);
      setEn(data.i18n?.en ?? {});
    }
  }, [data]);

  if (loading) return <LoadingState />;
  if (error || !form) return <ErrorState message="Paramètres indisponibles." onRetry={reload} />;

  const set = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const setRule = (i: number, field: "fr" | "en", value: string) =>
    setForm((f) => (f ? { ...f, studioRules: f.studioRules.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)) } : f));
  const addRule = () => setForm((f) => (f ? { ...f, studioRules: [...f.studioRules, { fr: "", en: "" }] } : f));
  const removeRule = (i: number) =>
    setForm((f) => (f ? { ...f, studioRules: f.studioRules.filter((_, idx) => idx !== i) } : f));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, ogImageMediaId: ogImage?.id ?? null, i18n: { en } };
      await api.put("/admin/settings", payload);
      notify("Paramètres enregistrés.");
    } catch (err) {
      notify(err instanceof ApiClientError ? err.message : "Échec de l'enregistrement.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <AdminHeader title="Paramètres du site" description="Coordonnées, réseaux, apparence et SEO." />

      <div className="space-y-10">
        <section className="space-y-5">
          <h2 className="font-display text-lg font-bold">Identité</h2>
          <TextField label="Nom du studio" value={form.studioName} onChange={(v) => set("studioName", v)} required />
          <TextField label="Accroche" value={form.tagline} onChange={(v) => set("tagline", v)} />
          <TextAreaField label="Description" value={form.description} onChange={(v) => set("description", v)} />
        </section>

        <section className="space-y-5">
          <h2 className="font-display text-lg font-bold">Contact & WhatsApp</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Email de contact" type="email" value={form.contactEmail} onChange={(v) => set("contactEmail", v)} />
            <TextField label="Téléphone" value={form.contactPhone} onChange={(v) => set("contactPhone", v)} />
          </div>
          <TextField
            label="Numéro WhatsApp"
            value={form.whatsappNumber}
            onChange={(v) => set("whatsappNumber", v)}
            hint="Format international sans « + », ex : 2376XXXXXXXX. Utilisé pour la confirmation des commandes."
          />
          <TextField label="Adresse" value={form.address} onChange={(v) => set("address", v)} />
        </section>

        <section className="space-y-5">
          <h2 className="font-display text-lg font-bold">Réseaux sociaux</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Instagram" value={form.socialInstagram} onChange={(v) => set("socialInstagram", v)} placeholder="https://" />
            <TextField label="YouTube" value={form.socialYoutube} onChange={(v) => set("socialYoutube", v)} placeholder="https://" />
            <TextField label="Facebook" value={form.socialFacebook} onChange={(v) => set("socialFacebook", v)} placeholder="https://" />
            <TextField label="TikTok" value={form.socialTiktok} onChange={(v) => set("socialTiktok", v)} placeholder="https://" />
            <TextField label="X" value={form.socialX} onChange={(v) => set("socialX", v)} placeholder="https://" />
            <TextField label="Spotify" value={form.socialSpotify} onChange={(v) => set("socialSpotify", v)} placeholder="https://" />
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="font-display text-lg font-bold">Apparence</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Thème"
              value={form.theme}
              onChange={(v) => set("theme", v)}
              options={[
                { value: "dark", label: "Sombre" },
                { value: "light", label: "Clair" },
              ]}
            />
            <SelectField
              label="Palette"
              value={form.palette}
              onChange={(v) => set("palette", v)}
              options={[
                { value: "default", label: "Par défaut (monochrome)" },
                { value: "ink", label: "Encre (contraste max)" },
              ]}
            />
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="font-display text-lg font-bold">Référencement (SEO)</h2>
          <TextField label="Titre par défaut" value={form.seoDefaultTitle} onChange={(v) => set("seoDefaultTitle", v)} required />
          <TextAreaField label="Description par défaut" value={form.seoDefaultDesc} onChange={(v) => set("seoDefaultDesc", v)} rows={3} />
          <MediaPickerField label="Image de partage (Open Graph)" media={ogImage} onChange={setOgImage} />
        </section>

        <section className="space-y-5">
          <h2 className="font-display text-lg font-bold">Studio (page « Le studio »)</h2>
          <TextAreaField label="Histoire" value={form.studioHistory} onChange={(v) => set("studioHistory", v)} rows={5} />
          <TextAreaField label="Vision" value={form.studioVision} onChange={(v) => set("studioVision", v)} rows={5} />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="field-label mb-0">Les règles du studio</p>
              <button type="button" className="btn-ghost px-3 py-1 text-sm" onClick={addRule}>+ Ajouter</button>
            </div>
            <p className="mb-3 text-xs text-fg-subtle">La dernière règle est mise en avant comme la plus importante (ex. « L'Arkane vaincra »).</p>
            <div className="space-y-3">
              {form.studioRules.map((rule, i) => (
                <div key={i} className="rounded-md border border-border p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className="field-input" placeholder={`Règle ${i + 1} (FR)`} value={rule.fr} onChange={(e) => setRule(i, "fr", e.target.value)} maxLength={200} />
                    <input className="field-input" placeholder={`Rule ${i + 1} (EN)`} value={rule.en} onChange={(e) => setRule(i, "en", e.target.value)} maxLength={200} />
                  </div>
                  <div className="mt-2 text-right">
                    <button type="button" className="text-xs text-fg-subtle hover:text-fg" onClick={() => removeRule(i)}>Retirer</button>
                  </div>
                </div>
              ))}
              {form.studioRules.length === 0 && (
                <p className="text-xs text-fg-subtle">Aucune règle. Ajoutez-en (5 recommandées).</p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="font-display text-lg font-bold">Traductions (anglais)</h2>
          <TranslationFields
            fields={[
              { key: "tagline", label: "Tagline" },
              { key: "description", label: "Description", multiline: true },
              { key: "seoDefaultTitle", label: "SEO title" },
              { key: "seoDefaultDesc", label: "SEO description", multiline: true },
              { key: "studioHistory", label: "Studio — history", multiline: true },
              { key: "studioVision", label: "Studio — vision", multiline: true },
            ]}
            value={en}
            onChange={setEn}
          />
        </section>
      </div>

      <FormActions>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : "Enregistrer"}
        </button>
      </FormActions>
    </form>
  );
}
