import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, Spinner } from "@/components/ui/states";
import { SmartImage } from "@/components/ui/SmartImage";
import { Pagination } from "@/components/ui/Pagination";
import { AdminHeader, StatusBadge, ConfirmButton, useAdminList } from "../components/common";
import { TextField, TextAreaField, NumberField, SelectField, FormActions, STATUS_OPTIONS } from "../components/forms";
import { MediaPickerField } from "../components/MediaPicker";
import { TranslationFields } from "../components/TranslationFields";
import { useToast } from "../ToastProvider";
import type { MediaDTO } from "@shared/types";

interface ArtistListItem {
  id: string;
  name: string;
  roleTitle: string;
  status: string;
  portrait: MediaDTO | null;
}

export function ArtistsListPage() {
  const { notify } = useToast();
  const list = useAdminList<ArtistListItem>("/admin/artists");

  const onDelete = async (id: string) => {
    await api.del(`/admin/artists/${id}`);
    notify("Artiste supprimé.");
    list.reload();
  };

  return (
    <div>
      <AdminHeader
        title="Artistes"
        action={
          <Link to="/admin/artistes/nouveau" className="btn-primary">
            Nouvel artiste
          </Link>
        }
      />
      {list.loading && <LoadingState />}
      {list.error && <ErrorState message="Liste indisponible." onRetry={list.reload} />}
      {list.data && list.data.items.length === 0 && <p className="text-sm text-fg-subtle">Aucun artiste.</p>}
      {list.data && list.data.items.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.data.items.map((a) => (
            <li key={a.id} className="flex items-center gap-4 px-4 py-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border">
                <SmartImage media={a.portrait} aspect="square" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg-strong">{a.name}</p>
                <p className="truncate text-xs text-fg-subtle">{a.roleTitle}</p>
              </div>
              <StatusBadge status={a.status} />
              <Link to={`/admin/artistes/${a.id}`} className="btn-ghost px-3 py-1.5 text-sm">
                Éditer
              </Link>
              <ConfirmButton message={`Supprimer « ${a.name} » ?`} onConfirm={() => onDelete(a.id)}>
                Suppr.
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={list.setPage} />}
    </div>
  );
}

interface ArtistForm {
  name: string;
  slug: string;
  roleTitle: string;
  bio: string;
  socialInstagram: string;
  socialYoutube: string;
  socialSpotify: string;
  socialAppleMusic: string;
  socialTiktok: string;
  socialX: string;
  status: string;
  sortOrder: number;
}

const EMPTY: ArtistForm = {
  name: "",
  slug: "",
  roleTitle: "",
  bio: "",
  socialInstagram: "",
  socialYoutube: "",
  socialSpotify: "",
  socialAppleMusic: "",
  socialTiktok: "",
  socialX: "",
  status: "draft",
  sortOrder: 0,
};

export function ArtistEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { notify } = useToast();
  const [form, setForm] = useState<ArtistForm>(EMPTY);
  const [portrait, setPortrait] = useState<MediaDTO | null>(null);
  const [en, setEn] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const existing = useApi(
    () =>
      isNew
        ? Promise.resolve(null)
        : api.get<ArtistForm & { portrait: MediaDTO | null; i18n?: { en?: Record<string, string> } }>(`/admin/artists/${id}`),
    [id],
  );

  useEffect(() => {
    if (existing.data) {
      const d = existing.data;
      setEn(d.i18n?.en ?? {});
      setForm({
        name: d.name,
        slug: d.slug,
        roleTitle: d.roleTitle,
        bio: d.bio,
        socialInstagram: d.socialInstagram,
        socialYoutube: d.socialYoutube,
        socialSpotify: d.socialSpotify,
        socialAppleMusic: d.socialAppleMusic,
        socialTiktok: d.socialTiktok,
        socialX: d.socialX,
        status: d.status,
        sortOrder: d.sortOrder,
      });
      setPortrait(d.portrait);
    }
  }, [existing.data]);

  if (!isNew && existing.loading) return <LoadingState />;
  if (!isNew && existing.error) return <ErrorState message="Artiste introuvable." />;

  const set = <K extends keyof ArtistForm>(key: K, value: ArtistForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, portraitMediaId: portrait?.id ?? null, i18n: { en } };
      if (isNew) await api.post("/admin/artists", payload);
      else await api.put(`/admin/artists/${id}`, payload);
      notify("Artiste enregistré.");
      navigate("/admin/artistes");
    } catch (err) {
      notify(err instanceof ApiClientError ? err.message : "Échec de l'enregistrement.", "error");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <AdminHeader title={isNew ? "Nouvel artiste" : "Modifier l'artiste"} />
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <TextField label="Nom" value={form.name} onChange={(v) => set("name", v)} required />
          <TextField label="Rôle / fonction" value={form.roleTitle} onChange={(v) => set("roleTitle", v)} />
          <TextAreaField label="Biographie" value={form.bio} onChange={(v) => set("bio", v)} rows={6} />
          <TextField label="Slug (optionnel)" value={form.slug} onChange={(v) => set("slug", v)} hint="Laissez vide pour générer automatiquement." />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Instagram" value={form.socialInstagram} onChange={(v) => set("socialInstagram", v)} placeholder="https://" />
            <TextField label="YouTube" value={form.socialYoutube} onChange={(v) => set("socialYoutube", v)} placeholder="https://" />
            <TextField label="Spotify" value={form.socialSpotify} onChange={(v) => set("socialSpotify", v)} placeholder="https://" />
            <TextField label="Apple Music" value={form.socialAppleMusic} onChange={(v) => set("socialAppleMusic", v)} placeholder="https://" />
            <TextField label="TikTok" value={form.socialTiktok} onChange={(v) => set("socialTiktok", v)} placeholder="https://" />
            <TextField label="X" value={form.socialX} onChange={(v) => set("socialX", v)} placeholder="https://" />
          </div>
          <TranslationFields
            fields={[
              { key: "roleTitle", label: "Role / title" },
              { key: "bio", label: "Biography", multiline: true },
            ]}
            value={en}
            onChange={setEn}
          />
        </div>
        <div className="space-y-6">
          <SelectField label="Statut" value={form.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
          <NumberField label="Ordre d'affichage" value={form.sortOrder} onChange={(v) => set("sortOrder", v ?? 0)} />
          <MediaPickerField label="Portrait" media={portrait} onChange={setPortrait} />
        </div>
      </div>
      <FormActions>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : "Enregistrer"}
        </button>
        <Link to="/admin/artistes" className="btn-ghost">
          Annuler
        </Link>
      </FormActions>
    </form>
  );
}
