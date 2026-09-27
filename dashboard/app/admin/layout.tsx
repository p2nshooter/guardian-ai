/* Admin portal layout — same shell as the member portal, admin menu.
 * Access is enforced by middleware.ts (admins only) and by every API route. */
import type { Metadata } from "next";
import Shell from "@/components/app/Shell";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <I18nProvider><Shell variant="admin">{children}</Shell></I18nProvider>;
}
