"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type HealthStatus } from "@/lib/api";
import { categoryIcon } from "@/lib/display";

export default function HomePage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((err: ApiError) => setHealthError(err.message));
    api.categories().then(setCategories).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setTrackingCode(null);
    try {
      const report = await api.createReport({
        description,
        location,
        category: category || undefined,
        severity: (severity as "low" | "medium" | "high" | "critical") || undefined,
        reporter_email: reporterEmail || undefined,
        image,
      });
      setTrackingCode(report.tracking_code);
      setDescription("");
      setLocation("");
      setCategory("");
      setSeverity("");
      setReporterEmail("");
      setImage(null);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyCode() {
    if (!trackingCode) return;
    navigator.clipboard?.writeText(trackingCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <main>
      <div className="hero">
        <span className="hero-badge">✨ AI-powered campus intelligence</span>
        <h1>CampusPulse</h1>
        <p>
          Spot a problem on campus? Tell us once. Our AI groups it with similar reports,
          prioritizes it, and routes it to the right team automatically.
        </p>
      </div>

      <p style={{ textAlign: "center", fontSize: "0.85rem" }}>
        Backend status:{" "}
        {health ? (
          <span className="status-ok">● {health.status}</span>
        ) : healthError ? (
          <span className="status-bad">● offline</span>
        ) : (
          <span style={{ color: "var(--text-faint)" }}>checking…</span>
        )}
      </p>

      {trackingCode ? (
        <div className="card glass-card" style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "2.5rem" }}>✅</div>
          <h2 style={{ marginTop: "0.75rem" }}>Report submitted!</h2>
          <p>Our AI has already classified and prioritized it. Save your tracking code:</p>
          <div
            style={{
              fontSize: "1.8rem",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              letterSpacing: "0.03em",
              margin: "0.75rem 0",
              color: "var(--brand-2)",
            }}
          >
            {trackingCode}
          </div>
          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={copyCode} className="secondary" style={{ marginTop: 0 }}>
              {copied ? "Copied ✓" : "Copy code"}
            </button>
            <Link href={`/track/${trackingCode}`}>
              <button style={{ marginTop: 0 }}>Track this report →</button>
            </Link>
          </div>
          <p style={{ marginTop: "1.25rem" }}>
            <button className="link-button" onClick={() => setTrackingCode(null)}>
              Submit another report
            </button>
          </p>
        </div>
      ) : (
        <div className="card">
          <h2>Report a campus problem</h2>
          <form onSubmit={handleSubmit}>
            <label htmlFor="description">What&rsquo;s the problem?</label>
            <textarea
              id="description"
              required
              minLength={10}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. The water fountain outside Block C has been leaking for two days."
            />

            <label htmlFor="location">Where is it?</label>
            <input
              id="location"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Block C, near the main entrance"
            />

            <div className="form-row">
              <div>
                <label htmlFor="category">Category</label>
                <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">🤖 Let AI decide</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {categoryIcon(c)} {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="severity">Severity</label>
                <select id="severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="">🤖 Let AI decide</option>
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>
            </div>

            <label htmlFor="image">Photo (optional)</label>
            <input
              id="image"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />

            <label htmlFor="reporterEmail">Your email (optional, for follow-up)</label>
            <input
              id="reporterEmail"
              type="email"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              placeholder="you@campus.edu"
            />

            <button type="submit" disabled={submitting} style={{ width: "100%" }}>
              {submitting ? "Analyzing with AI…" : "Submit report"}
            </button>
          </form>

          {submitError && (
            <p className="status-bad" style={{ marginTop: "1rem" }}>
              {submitError}
            </p>
          )}
        </div>
      )}

      <p style={{ marginTop: "2.5rem", textAlign: "center" }}>
        <Link href="/admin">Admin dashboard →</Link>
      </p>
    </main>
  );
}
