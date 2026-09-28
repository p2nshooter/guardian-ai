/* Admin portal layout — same shell as the member portal, admin menu.
 * Access is enforced by middleware.ts (admins only) and by every API route. */
export const runtime = "edge";
import type { Metadata } from "next";
import Shell from "@/components/app/Shell";
import { I18nProvider } from "@/lib/i18n";
import { dirOf } from "@/lib/i18n-shared";
import { serverLang } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const lang = await serverLang();
  return <I18nProvider initial={lang}><div dir={dirOf(lang)}><Shell variant="admin">{children}</Shell></div></I18nProvider>;
}
