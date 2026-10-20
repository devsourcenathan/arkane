import { useLang } from "@/app/providers/LanguageProvider";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const { t } = useLang();
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        className="btn-outline px-3 py-2 disabled:opacity-40"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label={t("Page précédente", "Previous page")}
      >
        ←
      </button>
      <span className="px-4 text-sm text-fg-muted" aria-live="polite">
        {t("Page", "Page")} {page} / {totalPages}
      </span>
      <button
        type="button"
        className="btn-outline px-3 py-2 disabled:opacity-40"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label={t("Page suivante", "Next page")}
      >
        →
      </button>
    </nav>
  );
}
