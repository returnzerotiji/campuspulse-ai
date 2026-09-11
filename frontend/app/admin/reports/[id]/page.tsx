"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type ReportDetail, type SimilarReport } from "@/lib/api";
import { useAdminAuth } from "@/lib/useAdminAuth";
import LoginForm from "@/components/LoginForm";

const STATUSES = ["new", "acknowledged", "in_progress", "resolved", "closed"];
const SEVERITIES = ["low", "medium", "high", "critical"];

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { loading, isAuthenticated } = useAdminAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <main className="wide-main">
        <p>Loading...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="wide-main">
        <LoginForm onSuccess={() => setRefreshKey((k) => k + 1)} />
      </main>
    );
  }

  return (
    <main className="wide-main">
      <ReportDetailContent key={refreshKey} id={id} />
    </main>
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
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !report) return <p className="status-bad">{error}</p>;
  if (!report) return <p>Loading...</p>;

  return (
    <>
      <p>
        <Link href="/admin">&larr; Back to dashboard</Link>
      </p>

      <div className="top-bar">
        <h1 style={{ marginBottom: 0 }}>{report.tracking_code}</h1>
        <span className="badge badge-high">priority {report.priority_score}</span>
      </div>

      <div className="card">
        <p>
          <strong>Description:</strong> {report.description}
        </p>
        {report.ai_summary && (
          <p>
            <strong>AI summary:</strong> {report.ai_summary}
          </p>
        )}
        <p>
          <strong>Location:</strong> {report.location}
        </p>
        {report.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${report.image_url}`}
            alt="Report attachment"
            style={{ maxWidth: 320, borderRadius: 8, marginTop: "0.5rem" }}
          />
        )}
        <p style={{ marginTop: "0.5rem" }}>
          <strong>Category:</strong> {report.category} ({report.category_source}) &nbsp;|&nbsp;{" "}
          <strong>Reported by:</strong> {report.reporter_email || "anonymous"}
        </p>
        {report.duplicate_of && (
          <p className="status-bad">
            Linked as a duplicate of report <code>{report.duplicate_of}</code>.
          </p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Triage</h3>
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

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
        {error && <p className="status-bad" style={{ marginTop: "1rem" }}>{error}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Timeline</h3>
        <ul>
          {report.events.map((event) => (
            <li key={event.id}>
              {new Date(event.created_at).toLocaleString()} &mdash; <strong>{event.event_type}</strong>
              {event.old_value && event.new_value ? `: ${event.old_value} → ${event.new_value}` : ""}
              {event.note ? ` (${event.note})` : ""} &mdash; {event.actor}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Similar / related reports</h3>
        {similar.length === 0 && <p style={{ opacity: 0.7 }}>No similar reports found.</p>}
        {similar.map(({ report: r, similarity }) => (
          <div key={r.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
            <Link href={`/admin/reports/${r.id}`}>
              {r.tracking_code} &mdash; {r.description}
            </Link>
            <div style={{ opacity: 0.6, fontSize: "0.85rem" }}>
              similarity {(similarity * 100).toFixed(1)}% · {r.status} · {r.location}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
