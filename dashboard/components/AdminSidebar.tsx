/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Shared, persistent admin navigation — used by every /admin/* page via
 * app/admin/layout.tsx. Before this, only the /admin dashboard itself had a
 * sidebar; every other admin page was a dead end you could only escape with
 * a "← Dashboard" link. One shared nav = one consistent, elegant portal.
 * ============================================================================ */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/client-auth";

interface NavItem { href: string; icon: string; label: string; group: string }

const NAV: NavItem[] = [
  { href: "/admin",                icon: "📊", label: "Dashboard",       group: "Overview" },
  { href: "/admin/analytics",      icon: "🌍", label: "Analytics",       group: "Overview" },
  { href: "/admin/revenue",        icon: "💰", label: "Revenue",         group: "Overview" },

  { href: "/admin/licenses",       icon: "🔑", label: "Licenses",        group: "Sales" },
  { href: "/admin/create-license", icon: "➕", label: "Create License",  group: "Sales" },
  { href: "/admin/clients",        icon: "👥", label: "Clients",         group: "Sales" },
  { href: "/admin/pricing",        icon: "💵", label: "Live Pricing",    group: "Sales" },
  { href: "/admin/promo-pricing",  icon: "🎉", label: "Promo Pricing",   group: "Sales" },
  { href: "/admin/resellers",      icon: "🤝", label: "Resellers",       group: "Sales" },
  { href: "/admin/trial-batch",    icon: "🎟️", label: "Trial Batch",     group: "Sales" },

  { href: "/admin/releases",       icon: "☁️", label: "Releases",        group: "Delivery" },
  { href: "/admin/playbooks",      icon: "📦", label: "Playbooks",       group: "Delivery" },

  { href: "/admin/gateways",       icon: "💳", label: "Payment Gateways",group: "Payments" },
  { href: "/admin/payment-methods",icon: "🪙", label: "Crypto Methods",  group: "Payments" },

  { href: "/admin/content",        icon: "📝", label: "Content",         group: "Marketing" },
  { href: "/admin/autopost",       icon: "📢", label: "AutoPost",        group: "Marketing" },

  { href: "/guide",                icon: "📖", label: "Guide",           group: "More" },
  { href: "/admin/account",        icon: "⚙️", label: "Account Settings",group: "More" },
];

const GROUPS = ["Overview", "Sales", "Delivery", "Payments", "Marketing", "More"];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav style={{
      width: 232, background: "#0b1220", borderRight: "1px solid #1e293b",
      padding: "20px 12px", display: "flex", flexDirection: "column", gap: 2,
      position: "sticky", top: 0, height: "100vh", overflowY: "auto", flexShrink: 0,
    }}>
      <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px", marginBottom: 20, textDecoration: "none" }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#0284c7,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, boxShadow: "0 4px 14px rgba(2,132,199,0.4)" }}>🛡</div>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", fontFamily: "Sora, sans-serif", letterSpacing: "0.3px" }}>AXTO Admin</span>
      </Link>

      <Link href="/admin/create-license" style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "10px", borderRadius: 10, textDecoration: "none", marginBottom: 14,
        background: "linear-gradient(135deg,#0284c7,#0d9488)", color: "#fff",
        fontWeight: 700, fontSize: 13, boxShadow: "0 4px 14px rgba(2,132,199,0.35)",
      }}>
        ✨ New License
      </Link>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {GROUPS.map(group => (
          <div key={group} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.6px", padding: "6px 12px 4px" }}>
              {group}
            </div>
            {NAV.filter(n => n.group === group).map(n => {
              const active = n.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8,
                  textDecoration: "none", fontSize: 13, fontWeight: active ? 700 : 600,
                  color: active ? "#7dd3fc" : "#cbd5e1",
                  background: active ? "rgba(2,132,199,0.15)" : "transparent",
                  marginBottom: 1, transition: "background 0.12s, color 0.12s",
                }}>
                  <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8, paddingTop: 14, borderTop: "1px solid #1e293b" }}>
        <button onClick={() => signOut()} style={{ width: "100%", padding: "9px", borderRadius: 8, border: "1px solid #1e293b", background: "transparent", color: "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
