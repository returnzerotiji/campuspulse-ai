"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Link2, MapPin } from "lucide-react";
import { api, ApiError, type ReportDetail } from "@/lib/api";
import { CategoryIcon, STATUS_FLOW, STATUS_LABEL } from "@/lib/display";

export default function TrackReportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .trackReport(code)
      .then(setReport)
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setLoading(false));
  }, [code]);

  const isClosed = report?.status === "closed";
  const currentIndex = report
    ? isClosed
      ? STATUS_FLOW.length - 1
      : STATUS_FLOW.indexOf(report.status as (typeof STATUS_FLOW)[number])
    : -1;

  return (
    <main>
      <p>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
          <ArrowLeft size={15} /> Back to home
        </Link>
      </p>
      <h1>Track report</h1>
      <p style={{ marginBottom: "1rem" }}>
        <code style={{ fontSize: "1.1rem" }}>{code}</code>
      </p>

      {loading && <div className="spinner" />}
      {error && <p className="status-bad">{error}</p>}

      {report && (
        <div className="card">
          <div className="stepper">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className={`step ${i < currentIndex ? "done" : ""} ${i === currentIndex ? "current" : ""}`}>
                <div className="step-dot">{i < currentIndex ? "✓" : i + 1}</div>
                <div className="step-label">{STATUS_LABEL[s]}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <span className={`badge badge-${report.status}`}>{STATUS_LABEL[report.status] ?? report.status}</span>
          </div>

          <p style={{ marginTop: "1rem" }}>
            <strong>Description</strong>
            <br />
            {report.description}
          </p>
          <p style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <MapPin size={15} /> {report.location}
          </p>
          <p>
            <span className="category-chip">
              <CategoryIcon category={report.category} /> {report.category}
            </span>{" "}
            · handled by <strong>{report.department}</strong>
          </p>
          <p style={{ fontSize: "0.85rem" }}>Submitted {new Date(report.created_at).toLocaleString()}</p>

          {report.duplicate_of && (
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
              <Link2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                This looks like the same issue as an existing report already being tracked — we&rsquo;ve
                linked it so it counts toward that issue&rsquo;s priority.
              </span>
            </div>
          )}

          <h3 style={{ marginTop: "1.5rem" }}>Timeline</h3>
          <ul className="timeline">
            {report.events.map((event) => (
              <li key={event.id}>
                <div className="timeline-time">{new Date(event.created_at).toLocaleString()}</div>
                {event.event_type.replace(/_/g, " ")}
                {event.old_value && event.new_value ? `: ${event.old_value} → ${event.new_value}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
