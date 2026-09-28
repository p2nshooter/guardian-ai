import type { Metadata } from "next";

export const metadata: Metadata = { title: "You're offline", robots: { index: false, follow: false } };

export default function OfflinePage() {
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl" aria-hidden="true">📡</div>
      <h1 className="mt-4 text-2xl font-bold">You're offline</h1>
      <p className="mt-2 max-w-md text-slate-600">AXTO needs an internet connection to reach your AI and your saved work. Check your connection and try again. <br /><span className="text-slate-500">Anda sedang offline — periksa koneksi internet lalu coba lagi.</span></p>
      <a href="/app" className="btn-primary mt-6">Try again</a>
    </section>
  );
}
