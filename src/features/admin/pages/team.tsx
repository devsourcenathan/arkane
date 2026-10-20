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

interface TeamItem {
  id: string;
  name: string;
  roleTitle: string;
  status: string;
  photo: MediaDTO | null;
}

export function TeamListPage() {
  const { notify } = useToast();
  const list = useAdminList<TeamItem>("/admin/team");

  const onDelete = async (id: string) => {
    await api.del(`/admin/team/${id}`);
    notify("Membre supprimé.");
    list.reload();
  };

  return (
    <div>
      <AdminHeader title="Équipe" action={<Link to="/admin/equipe/nouveau" className="btn-primary">Nouveau membre</Link>} />
      {list.loading && <LoadingState />}
      {list.error && <ErrorState message="Liste indisponible." onRetry={list.reload} />}
      {list.data && list.data.items.length === 0 && <p className="text-sm text-fg-subtle">Aucun membre.</p>}
      {list.data && list.data.items.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.data.items.map((m) => (
            <li key={m.id} className="flex items-center gap-4 px-4 py-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border">
                <SmartImage media={m.photo} aspect="square" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg-strong">{m.name}</p>
                <p className="truncate text-xs text-fg-subtle">{m.roleTitle}</p>
              </div>
              <StatusBadge status={m.status} />
              <Link to={`/admin/equipe/${m.id}`} className="btn-ghost px-3 py-1.5 text-sm">Éditer</Link>
              <ConfirmButton message={`Supprimer « ${m.name} » ?`} onConfirm={() => onDelete(m.id)}>Suppr.</ConfirmButton>
            </li>
          ))}
        </ul>
      )}
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={list.setPage} />}
    </div>
  );
}

interface TeamForm {
  name: string;
  roleTitle: string;
  bio: string;
  status: string;
  sortOrder: number;
}
const EMPTY: TeamForm = { name: "", roleTitle: "", bio: "", status: "draft", sortOrder: 0 };

export function TeamEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { notify } = useToast();
  const [form, setForm] = useState<TeamForm>(EMPTY);
  const [photo, setPhoto] = useState<MediaDTO | null>(null);
  const [en, setEn] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const existing = useApi(
    () =>
      isNew
        ? Promise.resolve(null)
        : api.get<TeamForm & { photo: MediaDTO | null; i18n?: { en?: Record<string, string> } }>(`/admin/team/${id}`),
    [id],
  );

  useEffect(() => {
    if (existing.data) {
      const d = existing.data;
      setEn(d.i18n?.en ?? {});
      setForm({ name: d.name, roleTitle: d.roleTitle, bio: d.bio, status: d.status, sortOrder: d.sortOrder });
      setPhoto(d.photo);
    }
  }, [existing.data]);

  if (!isNew && existing.loading) return <LoadingState />;
  if (!isNew && existing.error) return <ErrorState message="Membre introuvable." />;

  const set = <K extends keyof TeamForm>(key: K, value: TeamForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, photoMediaId: photo?.id ?? null, i18n: { en } };
      if (isNew) await api.post("/admin/team", payload);
      else await api.put(`/admin/team/${id}`, payload);
      notify("Membre enregistré.");
      navigate("/admin/equipe");
    } catch (err) {
      notify(err instanceof ApiClientError ? err.message : "Échec de l'enregistrement.", "error");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <AdminHeader title={isNew ? "Nouveau membre" : "Modifier le membre"} />
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <TextField label="Nom" value={form.name} onChange={(v) => set("name", v)} required />
          <TextField label="Rôle / poste" value={form.roleTitle} onChange={(v) => set("roleTitle", v)} />
          <TextAreaField label="Bio" value={form.bio} onChange={(v) => set("bio", v)} rows={5} />
          <TranslationFields
            fields={[
              { key: "roleTitle", label: "Role / title" },
              { key: "bio", label: "Bio", multiline: true },
            ]}
            value={en}
            onChange={setEn}
          />
        </div>
        <div className="space-y-6">
          <SelectField label="Statut" value={form.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
          <NumberField label="Ordre d'affichage" value={form.sortOrder} onChange={(v) => set("sortOrder", v ?? 0)} />
          <MediaPickerField label="Photo" media={photo} onChange={setPhoto} />
        </div>
      </div>
      <FormActions>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : "Enregistrer"}
        </button>
        <Link to="/admin/equipe" className="btn-ghost">Annuler</Link>
      </FormActions>
    </form>
  );
}
