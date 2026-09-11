/**
 * Thin fetch wrapper around the CampusPulse backend.
 *
 * Centralizes the base URL, auth header, and error handling so components
 * don't each reimplement "parse the {error: {code, message}} shape the
 * backend returns" or "attach the admin's bearer token".
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_STORAGE_KEY = "campuspulse_admin_token";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage failures (private browsing, etc.)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the CampusPulse API. Is it running?");
  }

  if (!response.ok) {
    let code = "unknown_error";
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      code = body?.error?.code ?? code;
      message = body?.error?.message ?? message;
    } catch {
      // response body wasn't JSON; fall back to the generic message above
    }
    throw new ApiError(response.status, code, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function jsonRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ---------- Types ----------

export interface HealthStatus {
  status: string;
  service?: string;
  environment?: string;
  database?: string;
}

export interface Report {
  id: string;
  tracking_code: string;
  description: string;
  location: string;
  image_url: string | null;
  reporter_email: string | null;
  category: string;
  category_source: string;
  severity: string;
  severity_source: string;
  priority_score: number;
  department: string;
  department_overridden: boolean;
  status: string;
  ai_summary: string | null;
  cluster_id: string | null;
  duplicate_of: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportEvent {
  id: string;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  actor: string;
  created_at: string;
}

export interface ReportDetail extends Report {
  events: ReportEvent[];
}

export interface SimilarReport {
  report: Report;
  similarity: number;
}

export interface Hotspot {
  cluster_id: string;
  report_count: number;
  open_count: number;
  max_priority: number;
  categories: string[];
  departments: string[];
  locations: string[];
  representative_summary: string;
  first_seen_at: string;
  last_seen_at: string;
}

export interface StatsOverview {
  total_reports: number;
  open_reports: number;
  resolved_reports: number;
  avg_resolution_hours: number | null;
  systemic_clusters: number;
  backlog_over_week: number;
  by_status: Record<string, number>;
  by_department: Record<string, number>;
  by_category: Record<string, number>;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface AdminInfo {
  id: string;
  email: string;
  name: string;
  department: string | null;
}

export interface ReportCreateInput {
  description: string;
  location: string;
  category?: string;
  severity?: "low" | "medium" | "high" | "critical";
  reporter_email?: string;
  image?: File | null;
}

export interface ReportUpdateInput {
  status?: string;
  department?: string;
  severity?: string;
  note?: string;
  actor?: string;
}

export const api = {
  health: () => request<HealthStatus>("/health"),
  healthDb: () => request<HealthStatus>("/health/db"),

  login: (email: string, password: string) =>
    jsonRequest<{ access_token: string; token_type: string }>("/auth/login", "POST", { email, password }),
  me: () => request<AdminInfo>("/auth/me"),

  categories: () => request<string[]>("/reports/categories"),
  departments: () => request<{ id: string; name: string; description: string | null }[]>("/departments"),

  createReport: (payload: ReportCreateInput) => {
    const form = new FormData();
    form.append("description", payload.description);
    form.append("location", payload.location);
    if (payload.category) form.append("category", payload.category);
    if (payload.severity) form.append("severity", payload.severity);
    if (payload.reporter_email) form.append("reporter_email", payload.reporter_email);
    if (payload.image) form.append("image", payload.image);
    return request<Report>("/reports", { method: "POST", body: form });
  },

  trackReport: (trackingCode: string) =>
    request<ReportDetail>(`/reports/track/${encodeURIComponent(trackingCode)}`),

  listReports: (params?: {
    status?: string;
    department?: string;
    category?: string;
    cluster_id?: string;
    sort_by_priority?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.department) qs.set("department", params.department);
    if (params?.category) qs.set("category", params.category);
    if (params?.cluster_id) qs.set("cluster_id", params.cluster_id);
    if (params?.sort_by_priority !== undefined) qs.set("sort_by_priority", String(params.sort_by_priority));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ total: number; items: Report[] }>(`/reports${suffix}`);
  },

  getReport: (id: string) => request<ReportDetail>(`/reports/${id}`),
  getSimilarReports: (id: string) => request<SimilarReport[]>(`/reports/${id}/similar`),
  updateReport: (id: string, payload: ReportUpdateInput) => jsonRequest<ReportDetail>(`/reports/${id}`, "PATCH", payload),

  statsOverview: () => request<StatsOverview>("/stats/overview"),
  hotspots: () => request<Hotspot[]>("/stats/hotspots"),
  trends: (days = 14) => request<TrendPoint[]>(`/stats/trends?days=${days}`),
};
