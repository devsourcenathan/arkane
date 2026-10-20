import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiClientError } from "@/lib/api";
import { Wordmark } from "@/components/brand/Wordmark";
import { Spinner } from "@/components/ui/states";
import { useAdminAuth } from "./AdminAuthProvider";

export function LoginPage() {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiClientError) {
        setError(err.status === 429 ? "Trop de tentatives. Réessayez plus tard." : "Identifiants invalides.");
      } else {
        setError("Connexion impossible.");
      }
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Wordmark className="h-6 text-fg-strong" />
        </div>
        <div className="rounded-lg border border-border bg-surface/40 p-7">
          <h1 className="font-display text-xl font-bold tracking-tight">Administration</h1>
          <p className="mt-1 text-sm text-fg-subtle">Connectez-vous pour continuer.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="field-label">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="field-label">
                Mot de passe
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-fg-strong">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <Spinner className="h-4 w-4" /> : "Se connecter"}
            </button>
          </form>
        </div>
        <div className="mt-5 text-center">
          <Link to="/" className="text-xs text-fg-subtle transition-colors hover:text-fg-muted">
            ← Retour au site
          </Link>
        </div>
        <p className="mt-8 text-center font-display text-xs font-bold uppercase tracking-[0.3em] text-fg-subtle">
          L'Arkane vaincra
        </p>
      </div>
    </div>
  );
}
