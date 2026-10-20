import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, Spinner } from "@/components/ui/states";
import { Pagination } from "@/components/ui/Pagination";
import { AdminHeader, StatusBadge, ConfirmButton, useAdminList } from "../components/common";
import { TextField, TextAreaField, NumberField, SelectField, FormActions, STATUS_OPTIONS } from "../components/forms";
import { MediaPickerField } from "../components/MediaPicker";
import { TranslationFields } from "../components/TranslationFields";
import { useToast } from "../ToastProvider";
import { formatXAF } from "@shared/money";
import type { MediaDTO, ServiceDTO } from "@shared/types";

export function ServicesListPage() {
  const { notify } = useToast();
  const list = useAdminList<ServiceDTO>("/admin/services");

  const onDelete = async (id: string) => {
    await api.del(`/admin/services/${id}`);
    notify("Service supprimé.");
    list.reload();
  };

  return (
    <div>
      <AdminHeader title="Services" action={<Link to="/admin/services/nouveau" className="btn-primary">Nouveau service</Link>} />
      {list.loading && <LoadingState />}
      {list.error && <ErrorState message="Liste indisponible." onRetry={list.reload} />}
      {list.data && list.data.items.length === 0 && <p className="text-sm text-fg-subtle">Aucun service.</p>}
      {list.data && list.data.items.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.data.items.map((s) => (
            <li key={s.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg-strong">{s.title}</p>
                <p className="truncate text-xs text-fg-subtle">
                  {s.priceFromXaf !== null ? `À partir de ${formatXAF(s.priceFromXaf)}` : s.summary}
                </p>
              </div>
              <StatusBadge status={s.status} />
              <Link to={`/admin/services/${s.id}`} className="btn-ghost px-3 py-1.5 text-sm">
                Éditer
              </Link>
              <ConfirmButton message={`Supprimer « ${s.title} » ?`} onConfirm={() => onDelete(s.id)}>
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

interface ServiceForm {
  title: string;
  slug: string;
  summary: string;
  description: string;
  priceFromXaf: number | null;
  priceNote: string;
  status: string;
  sortOrder: number;
}

const EMPTY: ServiceForm = {
  title: "",
  slug: "",
  summary: "",
  description: "",
  priceFromXaf: null,
  priceNote: "",
  status: "draft",
  sortOrder: 0,
};

export function ServiceEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { notify } = useToast();
  const [form, setForm] = useState<ServiceForm>(EMPTY);
  const [cover, setCover] = useState<MediaDTO | null>(null);
  const [en, setEn] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const existing = useApi(
    () =>
      isNew
        ? Promise.resolve(null)
        : api.get<ServiceForm & { cover: MediaDTO | null; i18n?: { en?: Record<string, string> } }>(`/admin/services/${id}`),
    [id],
  );

  useEffect(() => {
    if (existing.data) {
      const d = existing.data;
      setEn(d.i18n?.en ?? {});
      setForm({
        title: d.title,
        slug: d.slug,
        summary: d.summary,
        description: d.description,
        priceFromXaf: d.priceFromXaf,
        priceNote: d.priceNote,
        status: d.status,
        sortOrder: d.sortOrder,
      });
      setCover(d.cover);
    }
  }, [existing.data]);

  if (!isNew && existing.loading) return <LoadingState />;
  if (!isNew && existing.error) return <ErrorState message="Service introuvable." />;

  const set = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, coverMediaId: cover?.id ?? null, i18n: { en } };
      if (isNew) await api.post("/admin/services", payload);
      else await api.put(`/admin/services/${id}`, payload);
      notify("Service enregistré.");
      navigate("/admin/services");
    } catch (err) {
      notify(err instanceof ApiClientError ? err.message : "Échec de l'enregistrement.", "error");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <AdminHeader title={isNew ? "Nouveau service" : "Modifier le service"} />
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <TextField label="Titre" value={form.title} onChange={(v) => set("title", v)} required />
          <TextField label="Résumé" value={form.summary} onChange={(v) => set("summary", v)} hint="Phrase courte affichée dans les listes." />
          <TextAreaField label="Description" value={form.description} onChange={(v) => set("description", v)} rows={6} />
          <TextField label="Slug (optionnel)" value={form.slug} onChange={(v) => set("slug", v)} />
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField label="Prix à partir de (XAF)" value={form.priceFromXaf} onChange={(v) => set("priceFromXaf", v)} hint="Laissez vide si sur devis." />
            <TextField label="Mention tarifaire" value={form.priceNote} onChange={(v) => set("priceNote", v)} placeholder="sur devis, /jour…" />
          </div>
          <TranslationFields
            fields={[
              { key: "title", label: "Title" },
              { key: "summary", label: "Summary" },
              { key: "description", label: "Description", multiline: true },
              { key: "priceNote", label: "Price note" },
            ]}
            value={en}
            onChange={setEn}
          />
        </div>
        <div className="space-y-6">
          <SelectField label="Statut" value={form.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
          <NumberField label="Ordre d'affichage" value={form.sortOrder} onChange={(v) => set("sortOrder", v ?? 0)} />
          <MediaPickerField label="Visuel" media={cover} onChange={setCover} />
        </div>
      </div>
      <FormActions>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : "Enregistrer"}
        </button>
        <Link to="/admin/services" className="btn-ghost">
          Annuler
        </Link>
      </FormActions>
    </form>
  );
}
