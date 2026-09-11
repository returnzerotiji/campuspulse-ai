"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type ReportDetail } from "@/lib/api";

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
            <strong>Status:</strong> {report.status}
          </p>
          <p>
            <strong>Description:</strong> {report.description}
          </p>
          <p>
            <strong>Location:</strong> {report.location}
          </p>
          <p>
            <strong>Category:</strong> {report.category} ({report.category_source})
          </p>
          <p>
            <strong>Severity:</strong> {report.severity} ({report.severity_source})
          </p>
          <p>
            <strong>Department:</strong> {report.department}
          </p>
          <p>
            <strong>Submitted:</strong> {new Date(report.created_at).toLocaleString()}
          </p>

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
