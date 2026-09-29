/* /status — live platform status, checked from the visitor's own browser
 * against /api/health (database, cache, storage, signing and secrets). */
import type { Metadata } from "next";
import StatusBoard from "@/components/site/StatusBoard";
import { pageMeta } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({ title: "System status", description: `Live status of the ${SITE.name} platform — web apps, database, file storage and licensing.`, path: "/status" });

export default function StatusPage() {
  return (
    <section className="py-14">
      <div className="container-page max-w-3xl">
        <p className="eyebrow">Status</p>
        <h1 className="h-display mt-3">System status</h1>
        <p className="lead mt-4">A live check run from your browser right now. Self-hosted editions do not depend on this — they keep running on your own servers.</p>
        <div className="mt-8"><StatusBoard /></div>
      </div>
    </section>
  );
}
