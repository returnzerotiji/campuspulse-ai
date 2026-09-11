/**
 * Thin fetch wrapper around the CampusPulse backend.
 *
 * Centralizes the base URL and error handling so components don't each
 * reimplement "parse the {error: {code, message}} shape the backend returns".
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
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

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

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

export interface ReportCreateInput {
  description: string;
  location: string;
  category?: string;
  severity?: "low" | "medium" | "high" | "critical";
  reporter_email?: string;
}

export const api = {
  health: () => request<HealthStatus>("/health"),
  healthDb: () => request<HealthStatus>("/health/db"),
  createReport: (payload: ReportCreateInput) =>
    request<Report>("/reports", { method: "POST", body: JSON.stringify(payload) }),
  trackReport: (trackingCode: string) =>
    request<ReportDetail>(`/reports/track/${encodeURIComponent(trackingCode)}`),
  listReports: () => request<{ total: number; items: Report[] }>("/reports"),
};
