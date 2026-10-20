interface WordmarkProps {
  className?: string;
}

/** Logotype Arkane Production — monochrome, hérite de la couleur du texte. */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-extrabold ${className ?? ""}`}>
      <svg viewBox="0 0 32 32" className="h-[1.1em] w-auto" aria-hidden="true" fill="none">
        <path
          d="M4 27 L16 6 L28 27"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line x1="10" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
      </svg>
      <span className="text-[0.95rem] font-bold uppercase tracking-[0.22em] leading-none">Arkane Production</span>
    </span>
  );
}
