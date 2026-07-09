/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f0f9ff" }}>
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-white/5 mb-0 leading-none select-none">404</div>
        <div className="text-6xl mb-6 -mt-4">🔍</div>
        <h1 className="text-2xl font-black text-white mb-3">Page not found</h1>
        <p className="text-slate-500 text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/"
            className="bg-gradient-to-r from-cyan-700 to-cyan-500 text-white font-bold px-6 py-3 rounded-xl text-sm">
            Back to Home
          </Link>
          <Link href="/portal"
            className="glass glass-hover text-slate-400 font-semibold px-6 py-3 rounded-xl text-sm">
            Client Portal
          </Link>
        </div>
        <p className="text-slate-600 text-xs mt-8">
          Need help? <a href="mailto:hello@axto.io" className="text-cyan-600 hover:underline">hello@axto.io</a>
        </p>
      </div>
    </div>
  );
}
