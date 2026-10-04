"use client";

import { useEffect } from "react";

/* Once per visit, a two-second burst of Spanish red and gold over the page,
 * cut in this site's own shape (prism). Never clickable, skipped under
 * prefers-reduced-motion, and gone without a trace. */
const COLORS = ["#c60b1e", "#ffc400", "#7af0ff", "#c08bff", "#ffffff"];

export function Copa2026Burst() {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (sessionStorage.getItem("copa26")) return;
      sessionStorage.setItem("copa26", "1");
    } catch {
      /* storage blocked: still show it once */
    }
    const cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000";
    document.body.appendChild(cv);
    const g = cv.getContext("2d");
    if (!g) return void cv.remove();
    const k = Math.min(2, window.devicePixelRatio || 1);
    const W = (cv.width = window.innerWidth * k);
    const H = (cv.height = window.innerHeight * k);
    const bits = Array.from({ length: 110 }, (_, i) => ({
      x: W * (0.15 + Math.random() * 0.7),
      y: -20 * k - Math.random() * H * 0.3,
      vx: (Math.random() - 0.5) * 4 * k,
      vy: (2 + Math.random() * 4) * k,
      s: (4 + Math.random() * 5) * k,
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.25,
      c: COLORS[i % COLORS.length],
    }));
    const draw = (b: (typeof bits)[number]) => {
      g.fillStyle = b.c;
      g.beginPath();
      g.moveTo(0, -b.s * 0.8);
      g.lineTo(b.s * 0.7, b.s * 0.5);
      g.lineTo(-b.s * 0.7, b.s * 0.5);
      g.closePath();
      g.globalCompositeOperation = "lighter";
      g.fill();
      g.globalCompositeOperation = "source-over";
    };
    const t0 = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      const age = t - t0;
      g.clearRect(0, 0, W, H);
      g.globalAlpha = age > 1700 ? Math.max(0, 1 - (age - 1700) / 600) : 1;
      for (const b of bits) {
        b.vy += 0.05 * k;
        b.x += b.vx;
        b.y += b.vy;
        b.a += b.va;
        g.save();
        g.translate(b.x, b.y);
        g.rotate(b.a);
        draw(b);
        g.restore();
      }
      if (age < 2300) raf = requestAnimationFrame(frame);
      else cv.remove();
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      cv.remove();
    };
  }, []);
  return null;
}
