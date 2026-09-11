"use client";

import { useEffect, useState } from "react";
import { api, ApiError, getToken, setToken, type AdminInfo } from "@/lib/api";

/**
 * Small auth hook instead of a full context provider: every admin page is a
 * leaf under /admin, so each one just calls this once. Keeps the "who am I,
 * am I logged in" logic in one place without adding a provider tree.
 */
export function useAdminAuth() {
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

  return { admin, loading, login, logout, isAuthenticated: admin !== null };
}

export { ApiError };
