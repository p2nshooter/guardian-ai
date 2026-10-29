/* An affiliate link (?ref=<code>) on any public or sign-up page: the code is sent
 * once to /api/ref, which remembers it in an httpOnly cookie, and the parameter is
 * taken out of the address bar so it is not copied or bookmarked further. */
"use client";
import { useEffect } from "react";

export default function RefCapture() {
  useEffect(() => {
    const u = new URL(window.location.href);
    const code = u.searchParams.get("ref");
    if (!code) return;
    u.searchParams.delete("ref");
    window.history.replaceState(window.history.state, "", `${u.pathname}${u.search}${u.hash}`);
    fetch("/api/ref", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.trim().toLowerCase().slice(0, 16) }), keepalive: true }).catch(() => {});
  }, []);
  return null;
}
