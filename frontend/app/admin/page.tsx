"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, ApiError, type Hotspot, type Report, type StatsOverview, type TrendPoint } from "@/lib/api";
import { useAdminAuth } from "@/lib/useAdminAuth";
import LoginForm from "@/components/LoginForm";
import StatTile from "@/components/StatTile";

const STATUSES = ["new", "acknowledged", "in_progress", "resolved", "closed"];

export default function AdminDashboardPage() {
  const { admin, loading, logout, isAuthenticated } = useAdminAuth();
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
        <p>
          <Link href="/">&larr; Back to home</Link>
        </p>
        <LoginForm onSuccess={() => setRefreshKey((k) => k + 1)} />
      </main>
    );
  }

  return (
    <main className="wide-main">
      <div className="top-bar">
        <div>
          <h1 style={{ marginBottom: 0 }}>CampusPulse Intelligence Dashboard</h1>
          <p style={{ opacity: 0.7, marginTop: "0.25rem" }}>Signed in as {admin?.email}</p>
        </div>
        <button onClick={logout}>Sign out</button>
      </div>

      <Dashboard key={refreshKey} />
    </main>
  );
}

function Dashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [clusterFilter, setClusterFilter] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);

  const loadReports = useCallback(() => {
    api
      .listReports({
        status: statusFilter || undefined,
        department: departmentFilter || undefined,
        cluster_id: clusterFilter || undefined,
        sort_by_priority: true,
      })
      .then((res) => setReports(res.items))
      .catch((err: ApiError) => setError(err.message));
  }, [statusFilter, departmentFilter, clusterFilter]);

  useEffect(() => {
    api.statsOverview().then(setOverview).catch((err: ApiError) => setError(err.message));
    api.hotspots().then(setHotspots).catch((err: ApiError) => setError(err.message));
    api.trends(14).then(setTrends).catch((err: ApiError) => setError(err.message));
    api.departments().then((depts) => setDepartments(depts.map((d) => d.name))).catch(() => {});
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  if (error) return <p className="status-bad">{error}</p>;

  return (
    <>
      <div className="stat-grid">
        <StatTile label="Total reports" value={overview?.total_reports ?? "-"} />
        <StatTile label="Open" value={overview?.open_reports ?? "-"} />
        <StatTile label="Resolved" value={overview?.resolved_reports ?? "-"} />
        <StatTile
          label="Avg. resolution"
          value={overview?.avg_resolution_hours != null ? `${overview.avg_resolution_hours}h` : "-"}
        />
        <StatTile
          label="Systemic issues"
          value={overview?.systemic_clusters ?? "-"}
          hint="clusters with 2+ reports"
        />
        <StatTile
          label="Backlog"
          value={overview?.backlog_over_week ?? "-"}
          hint="open > 7 days"
        />
      </div>

      <section>
        <h2>Reports over time (last 14 days)</h2>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2>Systemic issues (hotspots)</h2>
        {hotspots.length === 0 && <p style={{ opacity: 0.7 }}>No recurring clusters yet.</p>}
        {hotspots.map((h) => (
          <div
            key={h.cluster_id}
            className="card"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setClusterFilter(h.cluster_id);
              document.getElementById("all-reports")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <div className="top-bar">
              <strong>{h.representative_summary}</strong>
              <span className="badge badge-high">priority {h.max_priority}</span>
            </div>
            <p style={{ opacity: 0.75, marginTop: "0.4rem" }}>
              {h.report_count} reports ({h.open_count} open) · {h.categories.join(", ")} ·{" "}
              {h.departments.join(", ")}
            </p>
            <p style={{ opacity: 0.6, fontSize: "0.85rem" }}>
              Locations: {h.locations.join("; ")}
            </p>
          </div>
        ))}
      </section>

      <section id="all-reports">
        <div className="top-bar">
          <h2>All reports</h2>
        </div>
        <div className="filter-bar">
          <label style={{ margin: 0 }}>
            Status:{" "}
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label style={{ margin: 0 }}>
            Department:{" "}
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          {clusterFilter && (
            <span className="badge badge-in_progress">
              Filtered to one cluster{" "}
              <button className="link-button" onClick={() => setClusterFilter(null)} style={{ marginLeft: "0.4rem" }}>
                clear
              </button>
            </span>
          )}
        </div>

        <div className="table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Tracking code</th>
                <th>Description</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} onClick={() => router.push(`/admin/reports/${r.id}`)}>
                  <td>{r.priority_score}</td>
                  <td>{r.tracking_code}</td>
                  <td style={{ maxWidth: 320 }}>{r.description}</td>
                  <td>{r.category}</td>
                  <td>
                    <span className={`badge badge-${r.severity}`}>{r.severity}</span>
                  </td>
                  <td>{r.department}</td>
                  <td>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ opacity: 0.7 }}>
                    No reports match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
