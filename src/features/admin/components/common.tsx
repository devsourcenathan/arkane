import { useState, type ReactNode } from "react";
import { api, qs } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import type { Paginated } from "@shared/types";

export function AdminHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-subtle">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
  active: "Actif",
  inactive: "Inactif",
  pending: "En attente",
  confirmed: "Confirmée",
  fulfilled: "Honorée",
  cancelled: "Annulée",
  unpaid: "Non payé",
  paid: "Payé",
  refunded: "Remboursé",
  new: "Nouveau",
  read: "Lu",
};

export function StatusBadge({ status }: { status: string }) {
  const strong = status === "published" || status === "paid" || status === "confirmed" || status === "new";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${
        strong ? "border-fg-muted bg-surface text-fg-strong" : "border-border text-fg-subtle"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** Bouton d'action destructive avec confirmation native. */
export function ConfirmButton({
  onConfirm,
  children,
  message = "Confirmer cette action ?",
  className = "btn-ghost text-fg-muted hover:text-fg-strong",
}: {
  onConfirm: () => void;
  children: ReactNode;
  message?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.confirm(message) && onConfirm()}
    >
      {children}
    </button>
  );
}

export interface AdminListControls<T> {
  data: Paginated<T> | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
  page: number;
  setPage: (p: number) => void;
  status: string;
  setStatus: (s: string) => void;
  search: string;
  setSearch: (s: string) => void;
}

/** Hook mutualisé pour les listes admin paginées (page + statut + recherche). */
export function useAdminList<T>(basePath: string, extra: Record<string, string> = {}): AdminListControls<T> {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const extraKey = JSON.stringify(extra);

  const { data, loading, error, reload } = useApi(
    () =>
      api.get<Paginated<T>>(
        `${basePath}${qs({ page, pageSize: 20, status: status || undefined, search: search || undefined, ...extra })}`,
      ),
    [basePath, page, status, search, extraKey],
  );

  const updateStatus = (s: string) => {
    setStatus(s);
    setPage(1);
  };
  const updateSearch = (s: string) => {
    setSearch(s);
    setPage(1);
  };

  return { data, loading, error, reload, page, setPage, status, setStatus: updateStatus, search, setSearch: updateSearch };
}
