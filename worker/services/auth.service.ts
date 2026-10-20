import type { Env } from "../types";
import { ApiError } from "../lib/errors";
import { verifyPassword } from "../lib/password";
import { generateToken, sha256Hex } from "../lib/token";
import { SESSION_TTL_SECONDS } from "../lib/cookies";
import { findUserByEmail, touchLastLogin, createSession, revokeSession } from "../repositories/admin.repo";
import type { LoginInput } from "@shared/validation";
import type { AdminUserDTO } from "@shared/types";

// Hash factice (format valide, 100000 itérations) : on vérifie toujours un hash
// même si l'utilisateur n'existe pas, pour éviter l'énumération par timing.
const DUMMY_HASH =
  "pbkdf2$SHA-256$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export interface LoginResult {
  sessionToken: string;
  csrfToken: string;
  user: AdminUserDTO;
}

export async function login(
  env: Env,
  input: LoginInput,
  ip: string,
  userAgent: string,
): Promise<LoginResult> {
  const user = await findUserByEmail(env, input.email);
  const ok = user
    ? await verifyPassword(input.password, user.password_hash)
    : await verifyPassword(input.password, DUMMY_HASH);

  if (!user || !ok) {
    throw ApiError.unauthorized("Identifiants invalides.");
  }

  const sessionToken = generateToken(32);
  const tokenHash = await sha256Hex(sessionToken);
  const csrfToken = generateToken(24);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await createSession(env, {
    userId: user.id,
    tokenHash,
    csrfSecret: csrfToken,
    expiresAt,
    ip,
    userAgent: userAgent.slice(0, 400),
  });
  await touchLastLogin(env, user.id);

  return {
    sessionToken,
    csrfToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      lastLoginAt: user.last_login_at,
    },
  };
}

export async function logout(env: Env, sessionId: string): Promise<void> {
  await revokeSession(env, sessionId);
}
