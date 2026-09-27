/* Member portal layout. Access is enforced by middleware.ts and every API route. */
import type { Metadata } from "next";
import Shell from "@/components/app/Shell";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = { title: "Member portal", robots: { index: false, follow: false } };

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <I18nProvider><Shell variant="member">{children}</Shell></I18nProvider>;
}
