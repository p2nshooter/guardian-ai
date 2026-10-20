/* Public website layout: header, footer, site-wide JSON-LD and the AdSense
 * loader (public pages only — never inside the member or admin portals). */
import SiteHeader from "@/components/site/SiteHeader";
import { Copa2026 } from "@/components/site/Copa2026";
import "../copa2026.css";
import SiteFooter from "@/components/site/SiteFooter";
import { JsonLd } from "@/components/JsonLd";
import { orgJsonLd, websiteJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";
import ChatWidget from "@/components/support/ChatWidget";
import { I18nProvider } from "@/lib/i18n";
import { InstallBar } from "@/components/pwa/Pwa";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      {/* Owner, 20 Oct 2026: the phone-app install bar sits at the very top; gone once AXTO is installed. */}
      <InstallBar />
      <JsonLd data={[orgJsonLd(), websiteJsonLd()]} />
      <Copa2026 />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <ChatWidget />
      {/* A plain async <script>, not next/script: it must be in the HTML the
          server sends, because the AdSense verification crawler reads that
          HTML and does not run JavaScript (afterInteractive scripts are only
          added in the browser). React 19 hoists it into <head>. */}
      {SITE.isPreview ? null : (
        <script async crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsenseClient}`} />
      )}
    </I18nProvider>
  );
}
