import { useState, type ChangeEvent } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, Spinner } from "@/components/ui/states";
import { SmartImage } from "@/components/ui/SmartImage";
import { AdminHeader, ConfirmButton } from "../components/common";
import { useToast } from "../ToastProvider";
import type { MediaDTO, Paginated } from "@shared/types";

export function MediaPage() {
  const { notify } = useToast();
  const { data, loading, error, reload } = useApi(() => api.get<Paginated<MediaDTO>>("/admin/media?pageSize=60"), []);
  const [selected, setSelected] = useState<MediaDTO | null>(null);
  const [alt, setAlt] = useState("");
  const [uploading, setUploading] = useState(false);

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.upload<MediaDTO>("/admin/media", form);
      notify("Média téléversé.");
      reload();
    } catch {
      notify("Échec du téléversement.", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const saveAlt = async () => {
    if (!selected) return;
    try {
      await api.patch(`/admin/media/${selected.id}`, { alt });
      notify("Texte alternatif enregistré.");
      reload();
    } catch {
      notify("Échec de l'enregistrement.", "error");
    }
  };

  const onDelete = async (id: string) => {
    try {
      await api.del(`/admin/media/${id}`);
      notify("Média supprimé.");
      setSelected(null);
      reload();
    } catch (err) {
      notify(err instanceof ApiClientError ? err.message : "Suppression impossible.", "error");
    }
  };

  return (
    <div>
      <AdminHeader
        title="Médiathèque"
        description="Images utilisées sur le site."
        action={
          <label className="btn-primary cursor-pointer">
            {uploading ? <Spinner className="h-4 w-4" /> : "Téléverser"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"
              className="hidden"
              onChange={onUpload}
              disabled={uploading}
            />
          </label>
        }
      />

      {loading && <LoadingState />}
      {error && <ErrorState message="Médiathèque indisponible." onRetry={reload} />}
      {data && (
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          {data.items.length === 0 ? (
            <p className="text-sm text-fg-subtle">Aucun média pour l'instant.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {data.items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelected(m);
                    setAlt(m.alt);
                  }}
                  className={`overflow-hidden rounded-md border transition-colors ${
                    selected?.id === m.id ? "border-fg" : "border-border hover:border-fg-muted"
                  }`}
                >
                  <SmartImage media={m} aspect="square" />
                </button>
              ))}
            </div>
          )}

          {selected && (
            <aside className="h-fit rounded-lg border border-border bg-surface/40 p-5 lg:sticky lg:top-6">
              <SmartImage media={selected} aspect="square" className="rounded-md" />
              <p className="mt-3 truncate text-xs text-fg-subtle" title={selected.filename}>
                {selected.filename}
              </p>
              <label className="field-label mt-4">Texte alternatif</label>
              <input className="field-input" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} />
              <div className="mt-4 flex items-center justify-between">
                <button type="button" className="btn-outline px-3 py-1.5 text-sm" onClick={saveAlt}>
                  Enregistrer
                </button>
                <ConfirmButton
                  message="Supprimer ce média ? (impossible s'il est utilisé par un contenu publié)"
                  onConfirm={() => onDelete(selected.id)}
                >
                  Supprimer
                </ConfirmButton>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
