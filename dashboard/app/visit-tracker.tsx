/* ==============================================================================
 * Client-side visitor beacon. Fires once per page load to /api/track, which
 * records a privacy-light daily × country aggregate. Renders nothing.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */
"use client";
import { useEffect } from "react";

export default function VisitTracker() {
  useEffect(() => {
    try {
      fetch("/api/track", { method: "POST", keepalive: true }).catch(() => {});
    } catch {
      /* never break the page */
    }
  }, []);
  return null;
}
