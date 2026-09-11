"use client";

import { useState } from "react";
import { Brain } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAdminAuth } from "@/lib/AdminAuthContext";

export default function LoginForm() {
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
      // On success, `admin` updates in AdminAuthContext -- every component
      // reading useAdminAuth() (including whoever rendered this form)
      // re-renders on its own; no callback needed.
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card glass-card" style={{ maxWidth: 380, margin: "3rem auto", textAlign: "center" }}>
      <div className="brand-mark" style={{ margin: "0 auto 0.75rem" }}>
        <Brain size={16} color="white" />
      </div>
      <h2>Admin sign in</h2>
      <p style={{ marginBottom: "1rem" }}>Access the intelligence dashboard.</p>
      <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
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

        <button type="submit" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error && <p className="status-bad" style={{ marginTop: "1rem" }}>{error}</p>}
      <p style={{ marginTop: "1.25rem", opacity: 0.65, fontSize: "0.78rem" }}>
        Seed credentials: admin@campuspulse.local / changeme123
      </p>
    </div>
  );
}
