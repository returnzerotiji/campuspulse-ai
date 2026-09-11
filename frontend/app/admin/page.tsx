"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  CheckCircle2,
  Clock,
  Flame,
  ClipboardList,
  CircleDot,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, ApiError, type Hotspot, type Report, type StatsOverview, type TrendPoint } from "@/lib/api";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import LoginForm from "@/components/LoginForm";
import KpiCard from "@/components/KpiCard";
import Sidebar from "@/components/Sidebar";
import Reveal from "@/components/Reveal";
import { CategoryIcon, priorityClass } from "@/lib/display";

const STATUSES = ["new", "acknowledged", "in_progress", "resolved", "closed"];

export default function AdminDashboardPage() {
  const { admin, loading, isAuthenticated } = useAdminAuth();

  useEffect(() => {
    document.title = "Dashboard · CampusPulse";
  }, []);

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
    <div className="app-shell">
      <Sidebar />
      <div className="shell-main">
        <div className="shell-topbar">
          <div>
            <h1>Intelligence Dashboard</h1>
            <p>Everything the AI pipeline has understood, grouped, and prioritized.</p>
          </div>
        </div>
        <Dashboard />
      </div>
    </div>
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
      <div className="kpi-grid">
        <Reveal delay={0}>
          <KpiCard icon={ClipboardList} iconBg="#eef0ff" iconFg="#6366f1" label="Total reports" value={overview?.total_reports ?? "-"} />
        </Reveal>
        <Reveal delay={0.05}>
          <KpiCard icon={CircleDot} iconBg="#fff1e0" iconFg="#f59e0b" label="Open" value={overview?.open_reports ?? "-"} />
        </Reveal>
        <Reveal delay={0.1}>
          <KpiCard icon={CheckCircle2} iconBg="#e3faf0" iconFg="#10b981" label="Resolved" value={overview?.resolved_reports ?? "-"} />
        </Reveal>
        <Reveal delay={0.15}>
          <KpiCard
            icon={Clock}
            iconBg="#e3f6fc"
            iconFg="#06b6d4"
            label="Avg. resolution"
            value={overview?.avg_resolution_hours ?? "-"}
            suffix={overview?.avg_resolution_hours != null ? "h" : ""}
          />
        </Reveal>
        <Reveal delay={0.2}>
          <KpiCard
            icon={Flame}
            iconBg="#fdeaea"
            iconFg="#ef4444"
            label="Systemic issues"
            value={overview?.systemic_clusters ?? "-"}
            hint="clusters with 2+ reports"
            pulse={!!overview?.systemic_clusters}
          />
        </Reveal>
        <Reveal delay={0.25}>
          <KpiCard
            icon={AlarmClock}
            iconBg="#f3e8ff"
            iconFg="#8b5cf6"
            label="Backlog"
            value={overview?.backlog_over_week ?? "-"}
            hint="open > 7 days"
          />
        </Reveal>
      </div>

      <section>
        <h2>Reports over time</h2>
        <div className="card" style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="areaLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-faint)" }} width={30} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: "0.85rem" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="url(#areaLine)"
                strokeWidth={2.5}
                fill="url(#areaFill)"
                dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section id="hotspots">
        <h2>Systemic issues</h2>
        {hotspots.length === 0 && (
          <div className="card" style={{ opacity: 0.7 }}>
            No recurring clusters yet — submit a few similar reports to see grouping in action.
          </div>
        )}
        {hotspots.map((h, i) => (
          <Reveal
            key={h.cluster_id}
            className="card clickable"
            delay={i * 0.06}
            style={{ cursor: "pointer" }}
          >
          <div
            onClick={() => {
              setClusterFilter(h.cluster_id);
              document.getElementById("all-reports")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <div className="top-bar">
              <strong style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {h.categories.map((c) => (
                  <CategoryIcon key={c} category={c} size={17} />
                ))}
                {h.representative_summary}
              </strong>
              <span className={`priority-pill ${priorityClass(h.max_priority)}`}>{h.max_priority}</span>
            </div>
            <p style={{ marginTop: "0.5rem" }}>
              <strong>{h.report_count}</strong> reports (<strong>{h.open_count}</strong> open) ·{" "}
              {h.categories.join(", ")} · routed to {h.departments.join(", ")}
            </p>
            <p style={{ fontSize: "0.82rem" }}>📍 {h.locations.join(" · ")}</p>
          </div>
          </Reveal>
        ))}
      </section>

      <section id="all-reports">
        <div className="top-bar">
          <h2>All reports</h2>
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
              Filtered to one cluster
              <button
                className="link-button"
                onClick={() => setClusterFilter(null)}
                aria-label="Clear cluster filter"
                title="Clear cluster filter"
                style={{ marginLeft: "0.3rem", display: "inline-flex", alignItems: "center" }}
              >
                <X size={13} />
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
                    <span className={`priority-pill ${priorityClass(r.priority_score)}`}>{r.priority_score}</span>
                  </td>
                  <td>
                    <code>{r.tracking_code}</code>
                  </td>
                  <td style={{ maxWidth: 320 }}>{r.description}</td>
                  <td>
                    <span className="category-chip">
                      <CategoryIcon category={r.category} /> {r.category}
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
