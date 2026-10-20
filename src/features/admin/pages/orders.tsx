import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, qs, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, Spinner } from "@/components/ui/states";
import { Pagination } from "@/components/ui/Pagination";
import { AdminHeader, StatusBadge } from "../components/common";
import { useToast } from "../ToastProvider";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { formatXAF } from "@shared/money";
import type { OrderDTO, Paginated } from "@shared/types";

interface OrderListItem {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  totalXaf: number;
  orderStatus: string;
  paymentStatus: string;
  itemCount: number;
  createdAt: string;
}

const ORDER_STATUSES = [
  { value: "", label: "Toutes" },
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmées" },
  { value: "fulfilled", label: "Honorées" },
  { value: "cancelled", label: "Annulées" },
];

export function OrdersListPage() {
  const [page, setPage] = useState(1);
  const [orderStatus, setOrderStatus] = useState("");

  const { data, loading, error, reload } = useApi(
    () => api.get<Paginated<OrderListItem>>(`/admin/orders${qs({ page, pageSize: 20, orderStatus: orderStatus || undefined })}`),
    [page, orderStatus],
  );

  return (
    <div>
      <AdminHeader title="Commandes" description="Suivi et confirmation manuelle des commandes." />

      <div className="mb-5 flex flex-wrap gap-2">
        {ORDER_STATUSES.map((s) => (
          <button
            key={s.value || "all"}
            type="button"
            onClick={() => {
              setOrderStatus(s.value);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1 text-sm ${
              orderStatus === s.value ? "border-fg bg-fg text-fg-inverted" : "border-border text-fg-muted hover:text-fg"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message="Commandes indisponibles." onRetry={reload} />}
      {data && data.items.length === 0 && <p className="text-sm text-fg-subtle">Aucune commande.</p>}
      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Commande</th>
                <th className="px-4 py-3 font-medium">Paiement</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((o) => (
                <tr key={o.id} className="hover:bg-surface/40">
                  <td className="px-4 py-3">
                    <Link to={`/admin/commandes/${o.id}`} className="font-mono text-fg-strong hover:underline">
                      {o.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-fg">{o.customerName}</div>
                    <div className="text-xs text-fg-subtle">{o.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3">{formatXAF(o.totalXaf)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.orderStatus} /></td>
                  <td className="px-4 py-3"><StatusBadge status={o.paymentStatus} /></td>
                  <td className="px-4 py-3 text-xs text-fg-subtle">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/commandes/${o.id}`} className="btn-outline whitespace-nowrap px-3 py-1.5 text-sm">
                      Gérer
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </div>
  );
}

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const { notify } = useToast();
  const { data, loading, error, reload } = useApi(
    () => api.get<OrderDTO & { internalNotes: string }>(`/admin/orders/${id}`),
    [id],
  );
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setOrderStatus(data.orderStatus);
      setPaymentStatus(data.paymentStatus);
      setNotes(data.internalNotes ?? "");
    }
  }, [data]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message="Commande introuvable." onRetry={reload} />;

  const save = async (override?: { orderStatus?: string; paymentStatus?: string }) => {
    setSaving(true);
    try {
      await api.patch(`/admin/orders/${id}/status`, {
        orderStatus: override?.orderStatus ?? orderStatus,
        paymentStatus: override?.paymentStatus ?? paymentStatus,
        internalNotes: notes,
      });
      notify("Commande mise à jour.");
      reload();
    } catch (err) {
      notify(err instanceof ApiClientError ? err.message : "Échec de la mise à jour.", "error");
    } finally {
      setSaving(false);
    }
  };

  const waUrl = buildWhatsappUrl(
    data.customerPhone,
    `Bonjour ${data.customerName}, au sujet de votre commande ${data.reference} chez nous…`,
  );

  return (
    <div>
      <Link to="/admin/commandes" className="text-sm text-fg-muted hover:text-fg">
        ← Commandes
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Commande <span className="font-mono">{data.reference}</span>
        </h1>
        <div className="flex gap-2">
          <StatusBadge status={data.orderStatus} />
          <StatusBadge status={data.paymentStatus} />
        </div>
      </div>
      <p className="mt-1 text-xs text-fg-subtle">{new Date(data.createdAt).toLocaleString("fr-FR")}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Articles + client */}
        <div className="space-y-8">
          <section className="rounded-lg border border-border">
            <ul className="divide-y divide-border">
              {data.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-fg-strong">{item.productName}</p>
                    <p className="text-xs text-fg-subtle">
                      {item.variantLabel} · {item.sku} · {item.quantity}× {formatXAF(item.unitPriceXaf)}
                    </p>
                  </div>
                  <span className="text-sm">{formatXAF(item.lineTotalXaf)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-border px-5 py-4">
              <span className="text-sm text-fg-muted">Total</span>
              <span className="font-display text-xl font-bold">{formatXAF(data.totalXaf)}</span>
            </div>
          </section>

          <section className="rounded-lg border border-border p-5">
            <h2 className="font-display text-base font-bold">Client</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex gap-2"><dt className="w-20 text-fg-subtle">Nom</dt><dd className="text-fg">{data.customerName}</dd></div>
              <div className="flex gap-2"><dt className="w-20 text-fg-subtle">Téléphone</dt><dd className="text-fg">{data.customerPhone}</dd></div>
              {data.customerEmail && <div className="flex gap-2"><dt className="w-20 text-fg-subtle">Email</dt><dd className="text-fg">{data.customerEmail}</dd></div>}
              {data.customerNote && <div className="flex gap-2"><dt className="w-20 text-fg-subtle">Note</dt><dd className="text-fg">{data.customerNote}</dd></div>}
            </dl>
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-outline mt-4 px-3 py-1.5 text-sm">
                Contacter sur WhatsApp
              </a>
            )}
          </section>
        </div>

        {/* Gestion du statut */}
        <aside className="h-fit space-y-5 rounded-lg border border-border bg-surface/40 p-5 lg:sticky lg:top-6">
          <div>
            <label className="field-label">Statut de la commande</label>
            <select className="field-input" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmée</option>
              <option value="fulfilled">Honorée</option>
              <option value="cancelled">Annulée (libère le stock)</option>
            </select>
          </div>
          <div>
            <label className="field-label">Statut du paiement</label>
            <select className="field-input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="unpaid">Non payé</option>
              <option value="paid">Payé</option>
              <option value="refunded">Remboursé</option>
            </select>
            <p className="mt-1 text-xs text-fg-subtle">Le paiement se confirme manuellement, après vérification.</p>
          </div>
          <div>
            <label className="field-label">Notes internes</label>
            <textarea className="field-input min-h-[90px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
          </div>
          <button type="button" className="btn-primary w-full" onClick={() => save()} disabled={saving}>
            {saving ? <Spinner className="h-4 w-4" /> : "Enregistrer"}
          </button>
          <div className="flex gap-2">
            {paymentStatus !== "paid" && (
              <button type="button" className="btn-outline flex-1 px-3 py-2 text-sm" onClick={() => { setPaymentStatus("paid"); save({ paymentStatus: "paid" }); }} disabled={saving}>
                Marquer payé
              </button>
            )}
            {data.orderStatus === "pending" && (
              <button type="button" className="btn-outline flex-1 px-3 py-2 text-sm" onClick={() => { setOrderStatus("confirmed"); save({ orderStatus: "confirmed" }); }} disabled={saving}>
                Confirmer
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
