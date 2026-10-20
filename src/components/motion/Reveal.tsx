import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Délai (ms) pour échelonner plusieurs éléments. */
  delayMs?: number;
  /** Décalage vertical initial (px). */
  y?: number;
}

/**
 * Révèle son contenu (fondu + léger glissement) quand il entre dans le viewport.
 * Respecte prefers-reduced-motion : affichage immédiat, sans animation.
 */
export function Reveal({ children, className = "", delayMs = 0, y = 18 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: shown ? `${delayMs}ms` : "0ms",
        transform: shown ? "none" : `translate3d(0, ${y}px, 0)`,
      }}
      className={`transition-all duration-700 ease-premium ${shown ? "opacity-100" : "opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}
