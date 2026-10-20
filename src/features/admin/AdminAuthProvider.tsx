import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, setCsrfToken, ApiClientError } from "@/lib/api";

export interface AdminUser {
  id: string;
  email: string;
}

interface AuthResponse {
  user: AdminUser;
  csrfToken: string;
}

interface AdminAuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get<AuthResponse>("/admin/auth/me")
      .then((res) => {
        if (!active) return;
        setCsrfToken(res.csrfToken);
        setUser(res.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/admin/auth/login", { email, password });
    setCsrfToken(res.csrfToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/admin/auth/logout");
    } catch (err) {
      if (!(err instanceof ApiClientError)) throw err;
    }
    setCsrfToken(null);
    setUser(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ user, loading, login, logout }}>{children}</AdminAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth doit être utilisé dans un AdminAuthProvider");
  return ctx;
}
