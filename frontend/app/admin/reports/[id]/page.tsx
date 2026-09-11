"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Sparkles, TriangleAlert } from "lucide-react";
import { api, ApiError, type ReportDetail, type SimilarReport } from "@/lib/api";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import LoginForm from "@/components/LoginForm";
import Sidebar from "@/components/Sidebar";
import PriorityBar from "@/components/PriorityBar";
import { CategoryIcon, priorityClass } from "@/lib/display";

const STATUSES = ["new", "acknowledged", "in_progress", "resolved", "closed"];
const SEVERITIES = ["low", "medium", "high", "critical"];

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { loading, isAuthenticated } = useAdminAuth();

  if (loading) {
    return (
      <main className="wide-main">
        <div className="spinner" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="wide-main">
        <LoginForm />
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="shell-main">
        <ReportDetailContent id={id} />
      </div>
    </div>
  );
}

function ReportDetailContent({ id }: { id: string }) {
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [similar, setSimilar] = useState<SimilarReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);

  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [severity, setSeverity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    api
      .getReport(id)
      .then((r) => {
        setReport(r);
        setStatus(r.status);
        setDepartment(r.department);
        setSeverity(r.severity);
      })
      .catch((err: ApiError) => setError(err.message));
    api.getSimilarReports(id).then(setSimilar).catch(() => {});
  }, [id]);

  useEffect(() => {
    load();
    api.departments().then((d) => setDepartments(d.map((x) => x.name))).catch(() => {});
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateReport(id, { status, department, severity, note: note || undefined });
      setNote("");
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !report) return <p className="status-bad">{error}</p>;
  if (!report) return <div className="spinner" />;

  return (
    <>
      <p>
        <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
          <ArrowLeft size={15} /> Back to dashboard
        </Link>
      </p>

      <div className="shell-topbar">
        <div>
          <h1>
            <code style={{ fontSize: "1.3rem" }}>{report.tracking_code}</code>
          </h1>
          <span className="category-chip" style={{ marginTop: "0.3rem" }}>
            <CategoryIcon category={report.category} size={16} /> {report.category}
          </span>
        </div>
        <span
          className={`priority-pill ${priorityClass(report.priority_score)}`}
          style={{ fontSize: "1.1rem", padding: "0.4rem 0.9rem" }}
        >
          {report.priority_score}
        </span>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card">
            <p>
              <strong>Description</strong>
              <br />
              {report.description}
            </p>
            {report.ai_summary && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.6rem 0.8rem",
                  background: "var(--info-bg)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.88rem",
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <Sparkles size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>AI summary:</strong> {report.ai_summary}
                </span>
              </div>
            )}
            <p style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <MapPin size={15} /> {report.location}
            </p>
            {report.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${report.image_url}`}
                alt="Report attachment"
                style={{ maxWidth: "100%", borderRadius: "var(--radius)", marginTop: "0.75rem", boxShadow: "var(--shadow-sm)" }}
              />
            )}
            <p style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
              Reported by {report.reporter_email || "anonymous"} · category set by {report.category_source} ·
              severity set by {report.severity_source}
            </p>
            {report.duplicate_of && (
              <p className="status-bad" style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <TriangleAlert size={15} /> Linked as a duplicate of <code>{report.duplicate_of}</code>
              </p>
            )}
          </div>

          {report.priority_breakdown && (
            <div className="card">
              <h3>Why this priority?</h3>
              <p style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                Rule-based, not another AI guess — same weights for every report.
              </p>
              <PriorityBar breakdown={report.priority_breakdown} />
            </div>
          )}

          <div className="card">
            <h3>Timeline</h3>
            <ul className="timeline">
              {report.events.map((event) => (
                <li key={event.id}>
                  <div className="timeline-time">{new Date(event.created_at).toLocaleString()}</div>
                  <strong>{event.event_type.replace(/_/g, " ")}</strong>
                  {event.old_value && event.new_value ? `: ${event.old_value} → ${event.new_value}` : ""}
                  {event.note ? ` — "${event.note}"` : ""}
                  <div style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>by {event.actor}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <div className="card">
            <h3>Triage</h3>
            <form onSubmit={handleSave}>
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <label>Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <label>Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <label>Note (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Ticket opened with vendor" />

              <button type="submit" disabled={saving} style={{ width: "100%" }}>
                {saved ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
              </button>
            </form>
            {error && <p className="status-bad" style={{ marginTop: "1rem" }}>{error}</p>}
          </div>

          <div className="card">
            <h3>Similar / related reports</h3>
            {similar.length === 0 && <p style={{ opacity: 0.7 }}>No similar reports found.</p>}
            {similar.map(({ report: r, similarity }) => (
              <div key={r.id} style={{ padding: "0.6rem 0", borderBottom: "1px solid var(--border)" }}>
                <Link href={`/admin/reports/${r.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <CategoryIcon category={r.category} size={15} /> {r.tracking_code}
                </Link>
                <div style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>{r.description}</div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.round(similarity * 100)}%` }} />
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", marginTop: "0.2rem" }}>
                  {(similarity * 100).toFixed(1)}% similar · {r.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
