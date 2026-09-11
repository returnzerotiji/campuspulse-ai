"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type ReportDetail } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  new: "Received",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

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

  return (
    <main>
      <p>
        <Link href="/">&larr; Back to home</Link>
      </p>
      <h1>Track report {code}</h1>

      {loading && <p>Loading...</p>}
      {error && <p className="status-bad">{error}</p>}

      {report && (
        <div className="card">
          <p>
            <strong>Status:</strong>{" "}
            <span className={`badge badge-${report.status}`}>{STATUS_LABEL[report.status] ?? report.status}</span>
          </p>
          <p>
            <strong>Description:</strong> {report.description}
          </p>
          <p>
            <strong>Location:</strong> {report.location}
          </p>
          <p>
            <strong>Category:</strong> {report.category}
          </p>
          <p>
            <strong>Handled by:</strong> {report.department}
          </p>
          <p>
            <strong>Submitted:</strong> {new Date(report.created_at).toLocaleString()}
          </p>

          {report.duplicate_of && (
            <p style={{ opacity: 0.8 }}>
              This looks like the same issue as an existing report already being tracked -- we&rsquo;ve
              linked it so it counts toward that issue&rsquo;s priority.
            </p>
          )}

          <h3 style={{ marginTop: "1.5rem" }}>Timeline</h3>
          <ul>
            {report.events.map((event) => (
              <li key={event.id}>
                {new Date(event.created_at).toLocaleString()} &mdash; {event.event_type}
                {event.old_value && event.new_value
                  ? `: ${event.old_value} → ${event.new_value}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
