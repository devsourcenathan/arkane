import type { Env } from "./types";

/** Infos de session attachées au contexte après authentification admin. */
export interface AuthContext {
  sessionId: string;
  adminUserId: string;
  email: string;
  csrfSecret: string;
}

/** Type d'environnement Hono partagé (bindings + variables de contexte). */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    auth: AuthContext;
  };
};
