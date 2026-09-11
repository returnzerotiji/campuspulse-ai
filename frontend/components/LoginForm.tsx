"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useAdminAuth } from "@/lib/useAdminAuth";

export default function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("admin@campuspulse.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 360, margin: "3rem auto" }}>
      <h2>Admin login</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {error && <p className="status-bad" style={{ marginTop: "1rem" }}>{error}</p>}
      <p style={{ marginTop: "1rem", opacity: 0.7, fontSize: "0.85rem" }}>
        Default seed credentials: admin@campuspulse.local / changeme123 (set ADMIN_EMAIL /
        ADMIN_PASSWORD in backend/.env to change).
      </p>
    </div>
  );
}
