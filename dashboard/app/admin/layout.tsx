/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * Shared chrome for every /admin/* page: one persistent sidebar so no admin
 * page is ever a dead end. Each page keeps its own auth check + content.
 * ============================================================================ */
"use client";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
