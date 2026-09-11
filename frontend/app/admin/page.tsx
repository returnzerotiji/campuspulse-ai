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
import { useAdminAuth } from "@/lib/AdminAuthContext";
import LoginForm from "@/components/LoginForm";
import StatTile from "@/components/StatTile";
import { categoryIcon, priorityClass } from "@/lib/display";

const STATUSES = ["new", "acknowledged", "in_progress", "resolved", "closed"];

export default function AdminDashboardPage() {
  const { admin, loading, logout, isAuthenticated } = useAdminAuth();

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
        <p>
          <Link href="/">&larr; Back to home</Link>
        </p>
        <LoginForm />
      </main>
    );
  }

  return (
    <main className="wide-main">
      <div className="top-bar">
        <div className="brand">
          <span className="brand-mark">🧠</span>
          <div>
            <div>CampusPulse</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", fontWeight: 500 }}>
              Intelligence Dashboard
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>👋 {admin?.email}</span>
          <button className="secondary" onClick={logout} style={{ marginTop: 0 }}>
            Sign out
          </button>
        </div>
      </div>

      <Dashboard />
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
        <StatTile icon="📋" label="Total reports" value={overview?.total_reports ?? "-"} accent="#6366f1" />
        <StatTile icon="🟠" label="Open" value={overview?.open_reports ?? "-"} accent="#f59e0b" />
        <StatTile icon="✅" label="Resolved" value={overview?.resolved_reports ?? "-"} accent="#10b981" />
        <StatTile
          icon="⏱️"
          label="Avg. resolution"
          value={overview?.avg_resolution_hours != null ? `${overview.avg_resolution_hours}h` : "-"}
          accent="#06b6d4"
        />
        <StatTile
          icon="🔥"
          label="Systemic issues"
          value={overview?.systemic_clusters ?? "-"}
          hint="clusters with 2+ reports"
          accent="#ef4444"
        />
        <StatTile
          icon="⏳"
          label="Backlog"
          value={overview?.backlog_over_week ?? "-"}
          hint="open > 7 days"
          accent="#8b5cf6"
        />
      </div>

      <section>
        <h2>📈 Reports over time</h2>
        <div className="card" style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={trends}>
              <defs>
                <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-faint)" }} width={30} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: "0.85rem" }}
              />
              <Bar dataKey="count" fill="url(#barFill)" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2>🔥 Systemic issues</h2>
        {hotspots.length === 0 && (
          <div className="card" style={{ opacity: 0.7 }}>
            No recurring clusters yet — submit a few similar reports to see grouping in action.
          </div>
        )}
        {hotspots.map((h) => (
            <div
              key={h.cluster_id}
              className="card clickable"
              onClick={() => {
                setClusterFilter(h.cluster_id);
                document.getElementById("all-reports")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <div className="top-bar">
                <strong>
                  {h.categories.map((c) => categoryIcon(c)).join(" ")} {h.representative_summary}
                </strong>
                <span className={`priority-pill ${priorityClass(h.max_priority)}`}>
                  {h.max_priority}
                </span>
              </div>
              <p style={{ marginTop: "0.5rem" }}>
                <strong>{h.report_count}</strong> reports (<strong>{h.open_count}</strong> open) ·{" "}
                {h.categories.join(", ")} · routed to {h.departments.join(", ")}
              </p>
              <p style={{ fontSize: "0.82rem" }}>📍 {h.locations.join(" · ")}</p>
            </div>
        ))}
      </section>

      <section id="all-reports">
        <div className="top-bar">
          <h2>📋 All reports</h2>
        </div>
        <div className="filter-bar">
          <label>
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Department
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
            <span className="badge badge-acknowledged">
              Filtered to one cluster{" "}
              <button className="link-button" onClick={() => setClusterFilter(null)} style={{ marginLeft: "0.3rem" }}>
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
                <th>Code</th>
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
                    <td>
                      <span className={`priority-pill ${priorityClass(r.priority_score)}`}>
                        {r.priority_score}
                      </span>
                    </td>
                    <td>
                      <code>{r.tracking_code}</code>
                    </td>
                    <td style={{ maxWidth: 320 }}>{r.description}</td>
                    <td>
                      <span className="category-chip">
                        {categoryIcon(r.category)} {r.category}
                      </span>
                    </td>
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
