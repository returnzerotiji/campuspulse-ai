"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type HealthStatus } from "@/lib/api";

export default function HomePage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((err: ApiError) => setHealthError(err.message));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setTrackingCode(null);
    try {
      const report = await api.createReport({
        description,
        location,
        reporter_email: reporterEmail || undefined,
      });
      setTrackingCode(report.tracking_code);
      setDescription("");
      setLocation("");
      setReporterEmail("");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>CampusPulse</h1>
      <p>
        Backend status:{" "}
        {health ? (
          <span className="status-ok">{health.status} ({health.environment})</span>
        ) : healthError ? (
          <span className="status-bad">{healthError}</span>
        ) : (
          "checking..."
        )}
      </p>

      <h2 style={{ marginTop: "2rem" }}>Report a campus problem</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          required
          minLength={10}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. The water fountain outside Block C has been leaking for two days."
        />

        <label htmlFor="location">Location</label>
        <input
          id="location"
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Block C, near the main entrance"
        />

        <label htmlFor="reporterEmail">Your email (optional)</label>
        <input
          id="reporterEmail"
          type="email"
          value={reporterEmail}
          onChange={(e) => setReporterEmail(e.target.value)}
          placeholder="so we could follow up (not required)"
        />

        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit report"}
        </button>
      </form>

      {submitError && <p className="status-bad" style={{ marginTop: "1rem" }}>{submitError}</p>}

      {trackingCode && (
        <div className="card">
          <p>Report submitted! Your tracking code is:</p>
          <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>{trackingCode}</p>
          <p>
            <Link href={`/track/${trackingCode}`}>Track this report &rarr;</Link>
          </p>
        </div>
      )}

      <p style={{ marginTop: "2rem" }}>
        <Link href="/admin">Admin dashboard &rarr;</Link>
      </p>
    </main>
  );
}
