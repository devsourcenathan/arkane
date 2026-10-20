interface FilterBarProps {
  options: string[];
  active: string | null;
  onChange: (value: string | null) => void;
  allLabel?: string;
}

/** Barre de filtres par catégorie, monochrome. */
export function FilterBar({ options, active, onChange, allLabel = "Tout" }: FilterBarProps) {
  if (options.length === 0) return null;
  const base =
    "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors duration-[var(--dur-fast)]";
  return (
    <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`${base} ${active === null ? "border-fg bg-fg text-fg-inverted" : "border-border text-fg-muted hover:border-fg-muted hover:text-fg"}`}
        aria-pressed={active === null}
      >
        {allLabel}
      </button>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`${base} ${active === opt ? "border-fg bg-fg text-fg-inverted" : "border-border text-fg-muted hover:border-fg-muted hover:text-fg"}`}
          aria-pressed={active === opt}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
