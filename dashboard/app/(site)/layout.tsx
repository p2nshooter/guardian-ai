/* Public website layout: header, footer, site-wide JSON-LD and the AdSense
 * loader (public pages only — never inside the member or admin portals). */
import Script from "next/script";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { JsonLd } from "@/components/JsonLd";
import { orgJsonLd, websiteJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[orgJsonLd(), websiteJsonLd()]} />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <Script id="adsense" async strategy="afterInteractive" crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsenseClient}`} />
    </>
  );
}
