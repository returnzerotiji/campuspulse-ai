"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, type AdminInfo } from "@/lib/api";

/**
 * Shared admin session state. This MUST be a Context, not a bare hook --
 * a bare `useAdminAuth()` hook would give every component (LoginForm,
 * the dashboard page, the detail page) its own independent `admin` state,
 * so a successful login in one place would never be visible in another.
 */
interface AdminAuthValue {
  admin: AdminInfo | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AdminInfo>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setAdmin)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { access_token } = await api.login(email, password);
    setToken(access_token);
    const me = await api.me();
    setAdmin(me);
    return me;
  }

  function logout() {
    setToken(null);
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider value={{ admin, loading, isAuthenticated: admin !== null, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  return ctx;
}
