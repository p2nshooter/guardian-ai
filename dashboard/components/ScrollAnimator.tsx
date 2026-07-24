"use client";
/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * ==============================================================================
 *
 * ScrollAnimator — site-wide, progressive-enhancement scroll reveal. Mounted
 * once (in the root layout). It finds content blocks (cards, section headings,
 * grids) and fades/slides them in as they enter the viewport. If JS never runs,
 * nothing is hidden — the elements are only made animatable by JS itself, so
 * content is always visible. Skips the admin area and respects reduced-motion.
 * ============================================================================ */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollAnimator() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't animate the admin control room — it's a dense data UI.
    if (pathname && pathname.startsWith("/admin")) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;

    // Re-scan shortly after route change so client-rendered content is caught.
    const timer = setTimeout(() => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          "section h2, section h3, .card, [data-reveal]"
        )
      ).filter((el) => !el.dataset.revealBound && el.offsetParent !== null);

      if (!nodes.length) return;

      nodes.forEach((el, i) => {
        el.dataset.revealBound = "1";
        // Only pre-hide elements currently below the fold, so above-the-fold
        // content never flashes.
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92) return; // already visible → leave as-is
        el.classList.add("sa-pre");
        el.style.transitionDelay = `${Math.min(i % 6, 5) * 60}ms`;
      });

      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              (e.target as HTMLElement).classList.add("sa-in");
              (e.target as HTMLElement).classList.remove("sa-pre");
              io.unobserve(e.target);
            }
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      nodes.forEach((el) => { if (el.classList.contains("sa-pre")) io.observe(el); });
    }, 120);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
