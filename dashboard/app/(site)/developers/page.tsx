/* /developers — AXTO Connect: the developer API and realtime transports.
 * SEO: metadata, canonical, JSON-LD (SoftwareApplication with features, FAQ, breadcrumbs),
 * sitemap entry and a footer link. Honest about what is not offered (WebTransport, native gRPC). */
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, faqJsonLd, breadcrumbJsonLd, softwareJsonLd } from "@/lib/seo";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { DEVCOPY } from "@/lib/developers-copy";
import DevelopersPublic, { type DevPlanRow } from "@/components/site/DevelopersPublic";
import { SITE } from "@/lib/site";

const DESCRIPTION = "AXTO Connect: connect websites, apps and AI agents to AXTO in real time — REST, Server-Sent Events, WebSocket, long polling, HTTP/2 & HTTP/3 streaming, the gRPC-compatible Connect protocol, WebRTC, signed webhooks and an MCP server.";

export const metadata: Metadata = pageMeta({
  title: "Developer API — SSE, WebSocket, WebRTC, MCP | AXTO Connect",
  description: DESCRIPTION,
  path: "/developers",
  keywords: ["realtime API", "Server-Sent Events API", "WebSocket API", "long polling", "WebRTC signaling", "gRPC Connect protocol", "MCP server", "webhooks", "AI streaming API", "API realtime Indonesia"],
});

export default function DevelopersPublicPage() {
  const plans: DevPlanRow[] = PLAN_ORDER.map((id) => ({ id, name: PLANS[id].name, apiKeys: PLANS[id].limits.apiKeys, apiRpm: PLANS[id].limits.apiRpm, webhooks: PLANS[id].limits.webhooks }));
  return (
    <>
      <JsonLd data={[
        softwareJsonLd({ name: "AXTO Connect", description: DESCRIPTION, path: "/developers", category: "DeveloperApplication", features: DEVCOPY.en.transports.map((t) => t[0]) }),
        faqJsonLd(DEVCOPY.en.faq.map(([q, a]) => ({ q, a }))),
        breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Developers", path: "/developers" }]),
      ]} />
      <DevelopersPublic base={SITE.url} plans={plans} />
    </>
  );
}
