interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Chargement"
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-border-strong border-t-fg ${className}`}
    />
  );
}

export function LoadingState({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-fg-muted">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ message = "Une erreur est survenue.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="max-w-md text-sm text-fg-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-outline">
          Réessayer
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border py-20 text-center">
      <p className="font-display text-xl text-fg">{title}</p>
      {description && <p className="max-w-sm text-sm text-fg-subtle">{description}</p>}
    </div>
  );
}
