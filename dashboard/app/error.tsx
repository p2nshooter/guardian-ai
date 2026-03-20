"use client";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f0f9ff" }}>
      <div className="glass rounded-2xl p-12 max-w-md w-full text-center">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-2xl font-black text-white mb-3">Something went wrong</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          An unexpected error occurred. If this persists, please contact{" "}
          <a href="mailto:hallo@axto.io" className="text-cyan-400 hover:underline">hallo@axto.io</a>.
        </p>
        {error?.digest && (
          <p className="text-xs text-slate-600 font-mono mb-6">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={reset}
            className="bg-gradient-to-r from-cyan-700 to-cyan-500 text-white font-bold px-6 py-3 rounded-xl text-sm">
            Try Again
          </button>
          <a href="/"
            className="glass glass-hover text-slate-400 font-semibold px-6 py-3 rounded-xl text-sm">
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
