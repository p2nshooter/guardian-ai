/* Sign-in, sign-up and password pages: one split layout — the form on the
 * right, what the member gets on the left. Not indexed (thin, duplicate). */
import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n";
import AuthFrame from "@/components/auth/AuthFrame";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <I18nProvider><AuthFrame>{children}</AuthFrame></I18nProvider>;
}
