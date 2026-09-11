import Link from "next/link";
import { Compass, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <main>
      <div className="card glass-card" style={{ textAlign: "center", padding: "3rem 2rem", maxWidth: 480, margin: "4rem auto" }}>
        <div className="brand-mark" style={{ margin: "0 auto 1.25rem" }}>
          <Compass size={16} color="white" />
        </div>
        <h1 style={{ fontSize: "2.2rem" }}>Off the map</h1>
        <p>This page doesn&rsquo;t exist — but the problem you&rsquo;re looking for probably does.</p>
        <div className="hero-actions" style={{ marginTop: "1.5rem" }}>
          <Link href="/" className="btn-primary-lg">
            Report a problem
          </Link>
          <Link href="/admin" className="btn-ghost-lg">
            <LayoutDashboard size={16} /> Admin dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
