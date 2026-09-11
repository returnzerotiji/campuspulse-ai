"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, ExternalLink, Flame, LayoutDashboard, LogOut, Table2 } from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, hash: "" },
  { href: "/admin#all-reports", label: "All reports", icon: Table2, hash: "#all-reports" },
  { href: "/admin#hotspots", label: "Hotspots", icon: Flame, hash: "#hotspots" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark" style={{ width: 30, height: 30, borderRadius: 9 }}>
          <Brain size={16} color="white" />
        </span>
        CampusPulse
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === "/admin" && item.hash === "";
          return (
            <Link key={item.label} href={item.href} className={isActive && item.href === "/admin" ? "active" : ""}>
              <Icon size={16} strokeWidth={2.25} />
              {item.label}
            </Link>
          );
        })}
        <Link href="/">
          <ExternalLink size={16} strokeWidth={2.25} />
          Student report form
        </Link>
      </nav>

      <div className="sidebar-foot">
        {admin && <div className="sidebar-user">👤 {admin.email}</div>}
        <button onClick={logout}>
          <LogOut size={16} strokeWidth={2.25} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
