import { useReducedMotion } from "@/lib/useReducedMotion";

/** Bandeau défilant (ticker) horizontal, décoratif. Pause si prefers-reduced-motion. */
export function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const reduced = useReducedMotion();
  const loop = [...items, ...items];

  return (
    <div className={`relative flex overflow-hidden ${className}`} aria-hidden>
      <ul className={`flex shrink-0 items-center gap-10 pr-10 ${reduced ? "" : "animate-marquee"}`}>
        {loop.map((item, i) => (
          <li key={i} className="flex items-center gap-10 whitespace-nowrap">
            <span className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-fg-subtle">
              {item}
            </span>
            <span className="h-1 w-1 rounded-full bg-border-strong" />
          </li>
        ))}
      </ul>
    </div>
  );
}
