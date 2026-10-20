/**
 * Montants en XAF (FCFA) : toujours des entiers, sans sous-unité.
 * Le calcul des totaux est effectué côté serveur ; ces helpers servent au rendu.
 */
export const CURRENCY = "XAF";

export function formatXAF(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(safe);
  return `${formatted} FCFA`;
}
