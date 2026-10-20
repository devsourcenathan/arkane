import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * Récupère des données asynchrones avec gestion de loading/erreur.
 * `deps` déclenche un rechargement (comme useEffect).
 */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // fn est recréée à chaque rendu : on la fige via les deps explicites.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  useEffect(() => {
    setLoading(true);
    setError(null);
    run()
      .then((result) => {
        if (mounted.current) setData(result);
      })
      .catch((err: Error) => {
        if (mounted.current) setError(err);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  }, [run, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}
