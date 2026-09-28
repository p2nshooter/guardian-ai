/* AXTO — GET /api/download/installer?os=windows|linux-amd64|linux-arm64|macos-arm64
 * Public download of AXTO Setup from R2 (axto-builds, builds/latest/installer/).
 * The installer is useless without a paid licence, so it needs no sign-in;
 * images are only released to licence holders (see /api/selfhosted/installer). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getR2Builds } from "@/lib/db";

const FILES: Record<string, { key: string; name: string; type: string }> = {
  windows: { key: "builds/latest/installer/AXTO-Setup.exe", name: "AXTO-Setup.exe", type: "application/vnd.microsoft.portable-executable" },
  "linux-amd64": { key: "builds/latest/installer/axto-setup-linux-amd64", name: "axto-setup", type: "application/octet-stream" },
  "linux-arm64": { key: "builds/latest/installer/axto-setup-linux-arm64", name: "axto-setup", type: "application/octet-stream" },
  "macos-arm64": { key: "builds/latest/installer/axto-setup-macos-arm64", name: "axto-setup", type: "application/octet-stream" },
  sha256: { key: "builds/latest/installer/SHA256SUMS.txt", name: "SHA256SUMS.txt", type: "text/plain; charset=utf-8" },
};

async function serve(req: NextRequest, head: boolean) {
  const f = FILES[new URL(req.url).searchParams.get("os") || "windows"];
  if (!f) return new NextResponse("Unknown platform.", { status: 404 });
  const bucket = getR2Builds(req);
  const obj = head ? await bucket.head(f.key) : await bucket.get(f.key);
  if (!obj) return new NextResponse("This download is being prepared. Please try again shortly.", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(head ? null : obj.body, {
    headers: {
      "Content-Type": f.type,
      "Content-Disposition": `attachment; filename="${f.name}"`,
      ...(obj.size ? { "Content-Length": String(obj.size) } : {}),
      ...(obj.httpEtag ? { ETag: obj.httpEtag } : {}),
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const GET = (req: NextRequest) => serve(req, false);
export const HEAD = (req: NextRequest) => serve(req, true);
