"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main>
      <div className="card glass-card" style={{ textAlign: "center", padding: "3rem 2rem", maxWidth: 480, margin: "4rem auto" }}>
        <div className="brand-mark" style={{ margin: "0 auto 1.25rem", background: "#ef4444" }}>
          <AlertTriangle size={16} color="white" />
        </div>
        <h1 style={{ fontSize: "1.8rem" }}>Something went wrong</h1>
        <p>That wasn&rsquo;t supposed to happen. Try again, or head back home.</p>
        <div className="hero-actions" style={{ marginTop: "1.5rem" }}>
          <button onClick={reset} style={{ marginTop: 0, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <RotateCcw size={16} /> Try again
          </button>
          <Link href="/" className="btn-ghost-lg">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
