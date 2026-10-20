import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, Spinner } from "@/components/ui/states";
import { SmartImage } from "@/components/ui/SmartImage";
import { Pagination } from "@/components/ui/Pagination";
import { AdminHeader, StatusBadge, ConfirmButton, useAdminList } from "../components/common";
import { TextField, TextAreaField, NumberField, SelectField, FormActions, STATUS_OPTIONS } from "../components/forms";
import { MediaPickerField, MediaMultiField } from "../components/MediaPicker";
import { TranslationFields } from "../components/TranslationFields";
import { useToast } from "../ToastProvider";
import { formatXAF } from "@shared/money";
import type { MediaDTO } from "@shared/types";

interface ProductListItem {
  id: string;
  name: string;
  category: string;
  status: string;
  fromPriceXaf: number;
  stockTotal: number;
  cover: MediaDTO | null;
}

export function ProductsListPage() {
  const { notify } = useToast();
  const list = useAdminList<ProductListItem>("/admin/products");

  const onDelete = async (id: string) => {
    await api.del(`/admin/products/${id}`);
    notify("Produit supprimé.");
    list.reload();
  };

  return (
    <div>
      <AdminHeader title="Produits" action={<Link to="/admin/produits/nouveau" className="btn-primary">Nouveau produit</Link>} />
      {list.loading && <LoadingState />}
      {list.error && <ErrorState message="Liste indisponible." onRetry={list.reload} />}
      {list.data && list.data.items.length === 0 && <p className="text-sm text-fg-subtle">Aucun produit.</p>}
      {list.data && list.data.items.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.data.items.map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-4 py-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border">
                <SmartImage media={p.cover} aspect="square" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg-strong">{p.name}</p>
                <p className="truncate text-xs text-fg-subtle">
                  {formatXAF(p.fromPriceXaf)} · {p.stockTotal} en stock
                </p>
              </div>
              <StatusBadge status={p.status} />
              <Link to={`/admin/produits/${p.id}`} className="btn-ghost px-3 py-1.5 text-sm">
                Éditer
              </Link>
              <ConfirmButton message={`Supprimer « ${p.name} » ?`} onConfirm={() => onDelete(p.id)}>
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

interface VariantRow {
  id?: string;
  sku: string;
  optionSize: string;
  optionColor: string;
  priceXaf: number | null;
  stock: number;
  status: string;
}

interface ProductForm {
  name: string;
  slug: string;
  category: string;
  description: string;
  basePriceXaf: number | null;
  status: string;
  sortOrder: number;
}

const EMPTY: ProductForm = {
  name: "",
  slug: "",
  category: "",
  description: "",
  basePriceXaf: null,
  status: "draft",
  sortOrder: 0,
};

function newVariant(): VariantRow {
  return { sku: "", optionSize: "", optionColor: "", priceXaf: null, stock: 0, status: "active" };
}

export function ProductEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { notify } = useToast();
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [cover, setCover] = useState<MediaDTO | null>(null);
  const [images, setImages] = useState<MediaDTO[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([newVariant()]);
  const [en, setEn] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const existing = useApi(
    () =>
      isNew
        ? Promise.resolve(null)
        : api.get<ProductForm & { cover: MediaDTO | null; images: MediaDTO[]; variants: VariantRow[]; i18n?: { en?: Record<string, string> } }>(`/admin/products/${id}`),
    [id],
  );

  useEffect(() => {
    if (existing.data) {
      const d = existing.data;
      setEn(d.i18n?.en ?? {});
      setForm({
        name: d.name,
        slug: d.slug,
        category: d.category,
        description: d.description,
        basePriceXaf: d.basePriceXaf,
        status: d.status,
        sortOrder: d.sortOrder,
      });
      setCover(d.cover);
      setImages(d.images);
      setVariants(d.variants.length > 0 ? d.variants : [newVariant()]);
    }
  }, [existing.data]);

  if (!isNew && existing.loading) return <LoadingState />;
  if (!isNew && existing.error) return <ErrorState message="Produit introuvable." />;

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setVariant = (i: number, patch: Partial<VariantRow>) =>
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.basePriceXaf === null) {
      notify("Le prix de base est requis.", "error");
      return;
    }
    const cleanVariants = variants.filter((v) => v.sku.trim() !== "");
    setSaving(true);
    try {
      const payload = {
        ...form,
        basePriceXaf: form.basePriceXaf,
        coverMediaId: cover?.id ?? null,
        imageMediaIds: images.map((m) => m.id),
        variants: cleanVariants,
        i18n: { en },
      };
      if (isNew) await api.post("/admin/products", payload);
      else await api.put(`/admin/products/${id}`, payload);
      notify("Produit enregistré.");
      navigate("/admin/produits");
    } catch (err) {
      notify(err instanceof ApiClientError ? err.message : "Échec (SKU en double ?).", "error");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <AdminHeader title={isNew ? "Nouveau produit" : "Modifier le produit"} />
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <TextField label="Nom" value={form.name} onChange={(v) => set("name", v)} required />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Catégorie" value={form.category} onChange={(v) => set("category", v)} />
            <NumberField label="Prix de base (XAF)" value={form.basePriceXaf} onChange={(v) => set("basePriceXaf", v)} required />
          </div>
          <TextAreaField label="Description" value={form.description} onChange={(v) => set("description", v)} rows={5} />
          <TextField label="Slug (optionnel)" value={form.slug} onChange={(v) => set("slug", v)} />

          {/* Variantes */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="field-label mb-0">Variantes (taille / couleur, stock)</p>
              <button type="button" className="btn-ghost px-3 py-1 text-sm" onClick={() => setVariants((vs) => [...vs, newVariant()])}>
                + Ajouter
              </button>
            </div>
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div key={v.id ?? i} className="rounded-md border border-border p-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                    <input className="field-input col-span-2 sm:col-span-2" placeholder="SKU *" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} />
                    <input className="field-input" placeholder="Taille" value={v.optionSize} onChange={(e) => setVariant(i, { optionSize: e.target.value })} />
                    <input className="field-input" placeholder="Couleur" value={v.optionColor} onChange={(e) => setVariant(i, { optionColor: e.target.value })} />
                    <input className="field-input" type="number" min={0} placeholder="Prix" value={v.priceXaf ?? ""} onChange={(e) => setVariant(i, { priceXaf: e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
                    <input className="field-input" type="number" min={0} placeholder="Stock" value={v.stock} onChange={(e) => setVariant(i, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-fg-muted">
                      <input type="checkbox" checked={v.status === "active"} onChange={(e) => setVariant(i, { status: e.target.checked ? "active" : "inactive" })} />
                      Active
                    </label>
                    <button type="button" className="text-xs text-fg-subtle hover:text-fg" onClick={() => setVariants((vs) => vs.filter((_, idx) => idx !== i))}>
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-fg-subtle">Prix par variante optionnel (hérite du prix de base si vide).</p>
          </div>

          <TranslationFields
            fields={[
              { key: "name", label: "Name" },
              { key: "description", label: "Description", multiline: true },
            ]}
            value={en}
            onChange={setEn}
          />
        </div>

        <div className="space-y-6">
          <SelectField label="Statut" value={form.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
          <NumberField label="Ordre d'affichage" value={form.sortOrder} onChange={(v) => set("sortOrder", v ?? 0)} />
          <MediaPickerField label="Couverture" media={cover} onChange={setCover} />
          <MediaMultiField label="Galerie d'images" media={images} onChange={setImages} />
        </div>
      </div>

      <FormActions>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : "Enregistrer"}
        </button>
        <Link to="/admin/produits" className="btn-ghost">
          Annuler
        </Link>
      </FormActions>
    </form>
  );
}
