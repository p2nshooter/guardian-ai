/* Sign-in, sign-up and password pages: one split layout — the form on the
 * right, what the member gets on the left. Not indexed (thin, duplicate). */
export const runtime = "edge";
import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n";
import { dirOf } from "@/lib/i18n-shared";
import { serverLang } from "@/lib/i18n-server";
import AuthFrame from "@/components/auth/AuthFrame";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const lang = await serverLang();
  return <I18nProvider initial={lang}><div dir={dirOf(lang)}><AuthFrame>{children}</AuthFrame></div></I18nProvider>;
}
