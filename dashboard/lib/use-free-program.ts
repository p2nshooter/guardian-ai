"use client";
/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * useFreeProgram — one client hook every public page uses to decide whether to
 * show the "free for a year" copy (program active) or auto-swap to the
 * "licence required — contact admin" copy (program ended). Reads the public
 * /api/free-access/status. When the admin countdown ends, `active` flips to
 * false everywhere at once — the free narrative disappears with no code edit.
 * ============================================================================ */
import { useEffect, useState } from "react";

export interface FreeProgram {
  loading: boolean;
  active: boolean;   // within the free window
  ended: boolean;    // window has closed → licence required, contact admin
  endISO: string;
  daysLeft: number;
  contact: { whatsapp: string; email: string[] };
}

export const AXTO_CONTACT = { whatsapp: "+6285691234561", email: ["hello@axto.io", "salam@ulyah.com"] };

const DEFAULT: FreeProgram = {
  loading: true, active: true, ended: false, endISO: "", daysLeft: 0, contact: AXTO_CONTACT,
};

let cache: Promise<any> | null = null;

export function useFreeProgram(): FreeProgram {
  const [state, setState] = useState<FreeProgram>(DEFAULT);
  useEffect(() => {
    cache ??= fetch("/api/free-access/status", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => ({ active: true, ended: false }));
    let alive = true;
    cache.then((v: any) => {
      if (!alive) return;
      setState({
        loading: false,
        active: v.active !== false && !v.ended,
        ended: !!v.ended,
        endISO: v.endISO || "",
        daysLeft: Number(v.daysLeft) || 0,
        contact: v.contact || AXTO_CONTACT,
      });
    });
    return () => { alive = false; };
  }, []);
  return state;
}
