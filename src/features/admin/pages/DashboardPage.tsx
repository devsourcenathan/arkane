import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { AdminHeader, StatusBadge } from "../components/common";
import { formatXAF } from "@shared/money";
import type { DashboardDTO } from "@shared/types";

const CARDS: { key: keyof DashboardDTO["counts"]; label: string; to: string }[] = [
  { key: "ordersPending", label: "Commandes en attente", to: "/admin/commandes" },
  { key: "messagesNew", label: "Nouveaux messages", to: "/admin/messages" },
  { key: "products", label: "Produits", to: "/admin/produits" },
  { key: "projects", label: "Productions", to: "/admin/productions" },
  { key: "artists", label: "Artistes", to: "/admin/artistes" },
  { key: "team", label: "Membres d'équipe", to: "/admin/equipe" },
  { key: "services", label: "Services", to: "/admin/services" },
];

export function DashboardPage() {
  const { data, loading, error, reload } = useApi(() => api.get<DashboardDTO>("/admin/dashboard"), []);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message="Tableau de bord indisponible." onRetry={reload} />;

  return (
    <div>
      <AdminHeader title="Tableau de bord" description="Vue d'ensemble de l'activité." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.key}
            to={c.to}
            className="rounded-lg border border-border bg-surface/40 p-5 transition-colors hover:border-border-strong"
          >
            <p className="font-display text-3xl font-bold tracking-tight">{data.counts[c.key]}</p>
            <p className="mt-1 text-sm text-fg-muted">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 font-display text-lg font-bold">Commandes récentes</h2>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-fg-subtle">Aucune commande.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/commandes/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface/50">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-fg-strong">{o.reference}</p>
                      <p className="truncate text-xs text-fg-subtle">{o.customerName}</p>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <StatusBadge status={o.orderStatus} />
                      <span className="text-sm">{formatXAF(o.totalXaf)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-lg font-bold">Stock faible</h2>
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-fg-subtle">Aucune alerte de stock.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {data.lowStock.map((s, i) => (
                <li key={`${s.sku}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">{s.productName}</p>
                    <p className="truncate text-xs text-fg-subtle">
                      {s.label} · {s.sku}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${s.stock === 0 ? "text-fg-strong" : "text-fg-muted"}`}>
                    {s.stock} en stock
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
