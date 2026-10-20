import { useState, type ChangeEvent } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { SmartImage } from "@/components/ui/SmartImage";
import { Spinner } from "@/components/ui/states";
import { useToast } from "../ToastProvider";
import type { MediaDTO, Paginated } from "@shared/types";

function MediaLibraryModal({
  onSelect,
  onClose,
}: {
  onSelect: (media: MediaDTO) => void;
  onClose: () => void;
}) {
  const { notify } = useToast();
  const [uploading, setUploading] = useState(false);
  const { data, loading, reload } = useApi(() => api.get<Paginated<MediaDTO>>("/admin/media?pageSize=40"), []);

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const media = await api.upload<MediaDTO>("/admin/media", form);
      notify("Média téléversé.");
      onSelect(media);
    } catch {
      notify("Échec du téléversement (type ou taille).", "error");
      reload();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-bg"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">Médiathèque</h2>
          <div className="flex items-center gap-3">
            <label className="btn-outline cursor-pointer px-3 py-2 text-sm">
              {uploading ? <Spinner className="h-4 w-4" /> : "Téléverser"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"
                className="hidden"
                onChange={onUpload}
                disabled={uploading}
              />
            </label>
            <button type="button" onClick={onClose} className="btn-ghost px-3">
              ✕
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-16 text-center">
              <Spinner />
            </div>
          ) : data && data.items.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {data.items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelect(m)}
                  className="overflow-hidden rounded-md border border-border transition-colors hover:border-fg"
                  title={m.filename}
                >
                  <SmartImage media={m} aspect="square" />
                </button>
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-fg-subtle">
              Aucun média. Téléversez votre première image.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function MediaPickerField({
  label,
  media,
  onChange,
}: {
  label: string;
  media: MediaDTO | null;
  onChange: (media: MediaDTO | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-md border border-border">
          <SmartImage media={media} aspect="square" />
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className="btn-outline px-3 py-1.5 text-sm" onClick={() => setOpen(true)}>
            {media ? "Changer" : "Choisir"}
          </button>
          {media && (
            <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => onChange(null)}>
              Retirer
            </button>
          )}
        </div>
      </div>
      {open && (
        <MediaLibraryModal
          onClose={() => setOpen(false)}
          onSelect={(m) => {
            onChange(m);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

export function MediaMultiField({
  label,
  media,
  onChange,
}: {
  label: string;
  media: MediaDTO[];
  onChange: (media: MediaDTO[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="flex flex-wrap gap-3">
        {media.map((m) => (
          <div key={m.id} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
            <SmartImage media={m} aspect="square" />
            <button
              type="button"
              onClick={() => onChange(media.filter((x) => x.id !== m.id))}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bg/80 text-xs text-fg"
              aria-label="Retirer"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border text-fg-subtle hover:border-fg-muted hover:text-fg"
        >
          +
        </button>
      </div>
      {open && (
        <MediaLibraryModal
          onClose={() => setOpen(false)}
          onSelect={(m) => {
            if (!media.some((x) => x.id === m.id)) onChange([...media, m]);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
