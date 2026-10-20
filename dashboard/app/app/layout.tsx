/* Member portal layout. Access is enforced by middleware.ts and every API route. */
export const runtime = "edge";
import type { Metadata } from "next";
import Shell from "@/components/app/Shell";
import { InstallBar } from "@/components/pwa/Pwa";
import { I18nProvider } from "@/lib/i18n";
import { dirOf } from "@/lib/i18n-shared";
import { serverLang } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Member portal", robots: { index: false, follow: false } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const lang = await serverLang();
  return <I18nProvider initial={lang}><InstallBar /><div dir={dirOf(lang)}><Shell variant="member">{children}</Shell></div></I18nProvider>;
}
