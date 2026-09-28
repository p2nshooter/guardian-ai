/* Dynamic segment → must run on the Edge runtime (Cloudflare Pages). */
export const runtime = "edge";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return children;
}
