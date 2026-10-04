/* /cookies — Cookie Policy. */
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { LegalDoc } from "@/components/site/LegalDoc";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMeta({ title: "Cookie Policy", description: `Which cookies ${SITE.name} uses for sign-in and preferences, how Google AdSense uses advertising cookies on public pages and how to control them.`, path: "/cookies" });
const UPDATED = "October 2026";

export default function CookiesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Cookie Policy", path: "/cookies" }])} />
      <LegalDoc title="Cookie Policy" updated={UPDATED} contactEmail={SITE.email}
        intro="Cookies are small text files stored in your browser. This policy explains which cookies are used on axto.io, why, and how you can control them."
        sections={[
          { h: "Essential cookies", p: ["When you sign in, we set a session cookie so the apps know who you are and keep your work private. We also remember your language and display preferences. These cookies are necessary for the service you request and are not used for advertising."] },
          { h: "No tracking cookies of our own", p: ["We do not set our own cookies to track you across websites or to build advertising profiles."] },
          { h: "Advertising cookies on public pages", p: ["Public pages of axto.io may show ads served by Google AdSense. Google and its partners may set or read cookies to serve ads, limit repetition, measure performance, personalize ads where you have allowed it and prevent fraud. Visitors in the European Economic Area, the United Kingdom and Switzerland are asked for consent first. Ads and advertising cookies are never used inside the member portal or the admin area.", "You can manage personalized ads in Google's Ads Settings (google.com/settings/ads) and read how Google uses cookies in advertising at policies.google.com/technologies/ads."] },
          { h: "Controlling cookies", p: ["You can view, block or delete cookies in your browser settings (Chrome: Privacy and security; Firefox: Privacy & Security; Safari: Privacy; Edge: Cookies and site permissions). Blocking essential cookies will prevent you from signing in, but public pages remain available."] },
          { h: "Changes", p: ["We will update this policy if the cookies we use change, with a new date at the top."] },
        ]} />
    </>
  );
}
