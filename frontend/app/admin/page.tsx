"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type Report } from "@/lib/api";

// Phase 1: no admin auth yet -- this page is open. Auth is planned as a
// follow-up (Phase 1.5) before this ships anywhere real.
export default function AdminDashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listReports()
      .then((res) => setReports(res.items))
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <p>
        <Link href="/">&larr; Back to home</Link>
      </p>
      <h1>Admin dashboard</h1>
      <p style={{ opacity: 0.7 }}>No login yet (Phase 1) &mdash; anyone with this URL can view it.</p>

      {loading && <p>Loading...</p>}
      {error && <p className="status-bad">{error}</p>}

      {!loading && !error && reports.length === 0 && <p>No reports yet.</p>}

      {reports.map((report) => (
        <div className="card" key={report.id}>
          <p>
            <strong>{report.tracking_code}</strong> &mdash; {report.status}
          </p>
          <p>{report.description}</p>
          <p style={{ opacity: 0.7 }}>
            {report.location} · {report.category} · {report.severity} · {report.department}
          </p>
        </div>
      ))}
    </main>
  );
}
