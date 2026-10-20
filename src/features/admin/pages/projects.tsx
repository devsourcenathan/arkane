import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, Spinner } from "@/components/ui/states";
import { SmartImage } from "@/components/ui/SmartImage";
import { Pagination } from "@/components/ui/Pagination";
import { AdminHeader, StatusBadge, ConfirmButton, useAdminList } from "../components/common";
import { TextField, TextAreaField, NumberField, SelectField, ToggleField, FormActions, STATUS_OPTIONS } from "../components/forms";
import { MediaPickerField } from "../components/MediaPicker";
import { TranslationFields } from "../components/TranslationFields";
import { useToast } from "../ToastProvider";
import type { MediaDTO, Paginated, ProjectSummaryDTO } from "@shared/types";

export function ProjectsListPage() {
  const { notify } = useToast();
  const list = useAdminList<ProjectSummaryDTO & { status: string }>("/admin/projects");

  const onDelete = async (id: string) => {
    await api.del(`/admin/projects/${id}`);
    notify("Production supprimée.");
    list.reload();
  };

  return (
    <div>
      <AdminHeader title="Productions" action={<Link to="/admin/productions/nouveau" className="btn-primary">Nouvelle production</Link>} />
      {list.loading && <LoadingState />}
      {list.error && <ErrorState message="Liste indisponible." onRetry={list.reload} />}
      {list.data && list.data.items.length === 0 && <p className="text-sm text-fg-subtle">Aucune production.</p>}
      {list.data && list.data.items.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.data.items.map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-4 py-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border">
                <SmartImage media={p.cover} aspect="square" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg-strong">
                  {p.featured && <span title="En avant">★ </span>}
                  {p.title}
                </p>
                <p className="truncate text-xs text-fg-subtle">
                  {p.category}
                  {p.artists.length > 0 && ` · ${p.artists.map((a) => a.name).join(", ")}`}
                </p>
              </div>
              <StatusBadge status={p.status} />
              <Link to={`/admin/productions/${p.id}`} className="btn-ghost px-3 py-1.5 text-sm">
                Éditer
              </Link>
              <ConfirmButton message={`Supprimer « ${p.title} » ?`} onConfirm={() => onDelete(p.id)}>
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

interface ProjectForm {
  title: string;
  slug: string;
  category: string;
  description: string;
  videoUrl: string;
  releaseDate: string;
  featured: boolean;
  status: string;
  sortOrder: number;
}

const EMPTY: ProjectForm = {
  title: "",
  slug: "",
  category: "",
  description: "",
  videoUrl: "",
  releaseDate: "",
  featured: false,
  status: "draft",
  sortOrder: 0,
};

export function ProjectEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { notify } = useToast();
  const [form, setForm] = useState<ProjectForm>(EMPTY);
  const [cover, setCover] = useState<MediaDTO | null>(null);
  const [artistIds, setArtistIds] = useState<string[]>([]);
  const [en, setEn] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const allArtists = useApi(
    () => api.get<Paginated<{ id: string; name: string }>>("/admin/artists?pageSize=200"),
    [],
  );

  const existing = useApi(
    () =>
      isNew
        ? Promise.resolve(null)
        : api.get<ProjectForm & { cover: MediaDTO | null; artistIds: string[]; i18n?: { en?: Record<string, string> } }>(`/admin/projects/${id}`),
    [id],
  );

  useEffect(() => {
    if (existing.data) {
      const d = existing.data;
      setEn(d.i18n?.en ?? {});
      setForm({
        title: d.title,
        slug: d.slug,
        category: d.category,
        description: d.description,
        videoUrl: d.videoUrl,
        releaseDate: d.releaseDate ? String(d.releaseDate).slice(0, 10) : "",
        featured: d.featured,
        status: d.status,
        sortOrder: d.sortOrder,
      });
      setCover(d.cover);
      setArtistIds(d.artistIds);
    }
  }, [existing.data]);

  if (!isNew && existing.loading) return <LoadingState />;
  if (!isNew && existing.error) return <ErrorState message="Production introuvable." />;

  const set = <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const toggleArtist = (artistId: string) =>
    setArtistIds((prev) => (prev.includes(artistId) ? prev.filter((x) => x !== artistId) : [...prev, artistId]));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        releaseDate: form.releaseDate || null,
        coverMediaId: cover?.id ?? null,
        artistIds,
        i18n: { en },
      };
      if (isNew) await api.post("/admin/projects", payload);
      else await api.put(`/admin/projects/${id}`, payload);
      notify("Production enregistrée.");
      navigate("/admin/productions");
    } catch (err) {
      notify(err instanceof ApiClientError ? err.message : "Échec de l'enregistrement.", "error");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <AdminHeader title={isNew ? "Nouvelle production" : "Modifier la production"} />
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <TextField label="Titre" value={form.title} onChange={(v) => set("title", v)} required />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Catégorie" value={form.category} onChange={(v) => set("category", v)} placeholder="Clip, Album, Film…" />
            <TextField label="Date de sortie" type="date" value={form.releaseDate} onChange={(v) => set("releaseDate", v)} />
          </div>
          <TextAreaField label="Description" value={form.description} onChange={(v) => set("description", v)} rows={6} />
          <TextField label="URL vidéo (YouTube / Vimeo)" value={form.videoUrl} onChange={(v) => set("videoUrl", v)} placeholder="https://youtu.be/…" />
          <TextField label="Slug (optionnel)" value={form.slug} onChange={(v) => set("slug", v)} />

          <div>
            <p className="field-label">Artistes associés</p>
            {allArtists.data && allArtists.data.items.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allArtists.data.items.map((a) => {
                  const sel = artistIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleArtist(a.id)}
                      className={`rounded-full border px-3 py-1 text-sm ${
                        sel ? "border-fg bg-fg text-fg-inverted" : "border-border text-fg-muted hover:text-fg"
                      }`}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-fg-subtle">Aucun artiste disponible. Créez-en d'abord.</p>
            )}
          </div>

          <TranslationFields
            fields={[
              { key: "title", label: "Title" },
              { key: "description", label: "Description", multiline: true },
            ]}
            value={en}
            onChange={setEn}
          />
        </div>
        <div className="space-y-6">
          <SelectField label="Statut" value={form.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
          <ToggleField label="Mettre en avant (accueil)" checked={form.featured} onChange={(v) => set("featured", v)} />
          <NumberField label="Ordre d'affichage" value={form.sortOrder} onChange={(v) => set("sortOrder", v ?? 0)} />
          <MediaPickerField label="Couverture" media={cover} onChange={setCover} />
        </div>
      </div>
      <FormActions>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : "Enregistrer"}
        </button>
        <Link to="/admin/productions" className="btn-ghost">
          Annuler
        </Link>
      </FormActions>
    </form>
  );
}
