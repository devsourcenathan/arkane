import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { AdminHeader, StatusBadge, ConfirmButton, useAdminList } from "../components/common";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "../ToastProvider";
import type { ContactMessageDTO } from "@shared/types";

function MessageDetail({ id, onChange }: { id: string; onChange: () => void }) {
  const { notify } = useToast();
  const { data, loading } = useApi(() => api.get<ContactMessageDTO>(`/admin/messages/${id}`), [id]);

  if (loading) return <div className="py-10"><LoadingState /></div>;
  if (!data) return null;

  const setStatus = async (status: string) => {
    await api.patch(`/admin/messages/${id}`, { status });
    notify("Message mis à jour.");
    onChange();
  };

  return (
    <div className="rounded-lg border border-border bg-surface/40 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold">{data.subject}</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {data.name}
            {data.email && ` · ${data.email}`}
            {data.phone && ` · ${data.phone}`}
          </p>
          <p className="mt-0.5 text-xs text-fg-subtle">{new Date(data.createdAt).toLocaleString("fr-FR")}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>
      <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-fg">{data.message}</p>
      <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
        {data.email && (
          <a href={`mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject)}`} className="btn-outline px-3 py-1.5 text-sm">
            Répondre par email
          </a>
        )}
        {data.status !== "archived" && (
          <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setStatus("archived")}>
            Archiver
          </button>
        )}
        {data.status === "archived" && (
          <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setStatus("read")}>
            Désarchiver
          </button>
        )}
      </div>
    </div>
  );
}

export function MessagesPage() {
  const { notify } = useToast();
  const list = useAdminList<ContactMessageDTO>("/admin/messages");
  const [openId, setOpenId] = useState<string | null>(null);

  const onDelete = async (id: string) => {
    await api.del(`/admin/messages/${id}`);
    notify("Message supprimé.");
    if (openId === id) setOpenId(null);
    list.reload();
  };

  const refresh = () => list.reload();

  return (
    <div>
      <AdminHeader title="Messages" description="Demandes reçues via le formulaire de contact." />

      <div className="mb-5 flex gap-2">
        {["", "new", "read", "archived"].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => list.setStatus(s)}
            className={`rounded-full border px-3 py-1 text-sm ${
              list.status === s ? "border-fg bg-fg text-fg-inverted" : "border-border text-fg-muted hover:text-fg"
            }`}
          >
            {s === "" ? "Tous" : s === "new" ? "Nouveaux" : s === "read" ? "Lus" : "Archivés"}
          </button>
        ))}
      </div>

      {list.loading && <LoadingState />}
      {list.error && <ErrorState message="Messages indisponibles." onRetry={list.reload} />}
      {list.data && list.data.items.length === 0 && <p className="text-sm text-fg-subtle">Aucun message.</p>}
      {list.data && list.data.items.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.data.items.map((m) => (
            <li key={m.id}>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setOpenId(openId === m.id ? null : m.id)}
                >
                  <p className="flex items-center gap-2 truncate text-sm text-fg-strong">
                    {m.status === "new" && <span className="h-2 w-2 shrink-0 rounded-full bg-fg" />}
                    {m.subject}
                  </p>
                  <p className="truncate text-xs text-fg-subtle">
                    {m.name} · {new Date(m.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </button>
                <ConfirmButton message="Supprimer ce message ?" onConfirm={() => onDelete(m.id)}>
                  Supprimer
                </ConfirmButton>
              </div>
              {openId === m.id && (
                <div className="border-t border-border p-4">
                  <MessageDetail id={m.id} onChange={refresh} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={list.setPage} />}
    </div>
  );
}
