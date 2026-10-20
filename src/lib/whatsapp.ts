import { formatXAF } from "@shared/money";
import type { OrderItemDTO } from "@shared/types";

/** Construit l'URL wa.me (numéro international, sans "+"). Null si numéro absent. */
export function buildWhatsappUrl(number: string, message: string): string | null {
  const digits = number.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

interface OrderMessageInput {
  reference: string;
  items: OrderItemDTO[];
  totalXaf: number;
  studioName: string;
}

/** Message WhatsApp pré-rempli : référence + récapitulatif + total (FR ou EN). */
export function buildOrderMessage(
  { reference, items, totalXaf, studioName }: OrderMessageInput,
  lang: "fr" | "en" = "fr",
): string {
  const lines = items.map(
    (i) => `• ${i.quantity}× ${i.productName} (${i.variantLabel}) — ${formatXAF(i.lineTotalXaf)}`,
  );
  if (lang === "en") {
    return [
      `Hello ${studioName},`,
      ``,
      `I'd like to confirm my order ${reference}:`,
      ...lines,
      ``,
      `Total: ${formatXAF(totalXaf)}`,
      ``,
      `Please let me know the payment and pickup details.`,
    ].join("\n");
  }
  return [
    `Bonjour ${studioName},`,
    ``,
    `Je souhaite confirmer ma commande ${reference} :`,
    ...lines,
    ``,
    `Total : ${formatXAF(totalXaf)}`,
    ``,
    `Merci de m'indiquer les modalités de paiement et de retrait.`,
  ].join("\n");
}
