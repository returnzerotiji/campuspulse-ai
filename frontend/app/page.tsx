"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain,
  CheckCheck,
  ClipboardList,
  Copy,
  Flame,
  GitMerge,
  LayoutDashboard,
  Layers,
  LineChart,
  Route,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { api, ApiError, type HealthStatus } from "@/lib/api";
import { CategoryIcon } from "@/lib/display";

const PIPELINE = [
  { icon: ClipboardList, label: "Report", sub: "Student submits" },
  { icon: Brain, label: "Understand", sub: "AI classifies" },
  { icon: Layers, label: "Group", sub: "Semantic clustering" },
  { icon: TrendingUp, label: "Prioritize", sub: "Rule-based score" },
  { icon: Route, label: "Route", sub: "To department" },
  { icon: CheckCheck, label: "Resolve", sub: "Staff acts" },
  { icon: LineChart, label: "Learn", sub: "Trends & hotspots" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "AI issue classification",
    body: "Claude reads free-text reports and extracts category, severity, and a clean summary — no rigid forms required.",
  },
  {
    icon: GitMerge,
    title: "Semantic duplicate detection",
    body: "Local embeddings catch the same issue described completely differently — no shared keywords needed.",
  },
  {
    icon: Flame,
    title: "Systemic issue detection",
    body: "Repeated reports across time and location surface as one underlying problem, not 50 separate tickets.",
  },
  {
    icon: TrendingUp,
    title: "Explainable priority scoring",
    body: "Severity, frequency, category risk, and persistence combine into one transparent, auditable score.",
  },
  {
    icon: Route,
    title: "Intelligent routing",
    body: "Every category maps to exactly one responsible department — routing is never a guess.",
  },
  {
    icon: Copy,
    title: "Full transparency",
    body: "Students track resolution with just a code. Admins see hotspots, trends, and backlog in one view.",
  },
];

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
    <>
      <nav className="site-nav">
        <div className="brand">
          <span className="brand-mark">
            <Brain size={17} color="white" />
          </span>
          CampusPulse
        </div>
        <Link href="/admin" className="nav-cta">
          <LayoutDashboard size={15} /> Admin dashboard
        </Link>
      </nav>

      <div className="landing">
        <div className="hero-v2">
          <span className="hero-badge">
            <Sparkles size={13} /> AI-powered campus problem intelligence
          </span>
          <h1>Scattered complaints, one clear picture.</h1>
          <p>
            CampusPulse turns individual student reports into campus-wide intelligence — grouping
            duplicates, surfacing systemic issues, and routing everything to the right team
            automatically.
          </p>
          <div className="hero-actions">
            <a href="#report-form" className="btn-primary-lg">
              <ClipboardList size={17} /> Report a problem
            </a>
            <Link href="/admin" className="btn-ghost-lg">
              <LayoutDashboard size={17} /> View intelligence dashboard
            </Link>
          </div>
          <p style={{ marginTop: "1.5rem", fontSize: "0.8rem" }}>
            Backend:{" "}
            {health ? (
              <span className="status-ok">● {health.status}</span>
            ) : healthError ? (
              <span className="status-bad">● offline</span>
            ) : (
              <span style={{ color: "var(--text-faint)" }}>checking…</span>
            )}
          </p>
        </div>

        <span className="section-eyebrow">The loop</span>
        <h2 className="section-title">Report → Understand → Group → Prioritize → Route → Resolve → Learn</h2>
        <p className="section-sub">
          A continuous intelligence loop — not a ticket dump. Every stage is powered by the pipeline
          described below.
        </p>
        <div className="pipeline">
          {PIPELINE.map((step, i) => {
            const Icon = step.icon;
            return (
              <div className="pipeline-step" key={step.label}>
                <div className="pipeline-icon">
                  <Icon size={20} strokeWidth={2.25} />
                </div>
                <div className="pipeline-label">{step.label}</div>
                <div className="pipeline-sub">{step.sub}</div>
                {i < PIPELINE.length - 1 && (
                  <svg className="pipeline-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        <span className="section-eyebrow">Key features</span>
        <h2 className="section-title">Not just a ticketing system</h2>
        <p className="section-sub">
          Traditional systems treat 50 similar complaints as 50 tickets. CampusPulse discovers the
          one problem behind them.
        </p>
        <div className="feature-grid">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">
                  <Icon size={20} strokeWidth={2.25} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            );
          })}
        </div>

        <span className="section-eyebrow" id="report-form">
          Try it now
        </span>
        <h2 className="section-title">Report a campus problem</h2>
        <p className="section-sub">Describe what's wrong — the AI handles classification, grouping, and routing.</p>

        {trackingCode ? (
          <div className="card glass-card" style={{ textAlign: "center", padding: "2rem", maxWidth: 480, margin: "0 auto" }}>
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
          <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
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
                        {c}
                      </option>
                    ))}
                  </select>
                  {category && (
                    <div style={{ marginTop: "0.4rem" }}>
                      <span className="category-chip">
                        <CategoryIcon category={category} /> {category}
                      </span>
                    </div>
                  )}
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

        <p style={{ marginTop: "3rem", textAlign: "center", fontSize: "0.8rem" }}>
          Built for Campusathon 2026 · Team Gradient Descenters · PS5 — Campus Problem Intelligence
        </p>
      </div>
    </>
  );
}
