/* AXTO — GET /api/download/installer?os=windows|linux-amd64|linux-arm64|macos-arm64
 * Public download of AXTO Setup from R2 (axto-builds, builds/latest/installer/).
 * The installer is useless without a paid licence, so it needs no sign-in;
 * images are only released to licence holders (see /api/selfhosted/installer). */
export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { serveBuild } from "@/lib/builds";

const FILES: Record<string, { key: string; name: string; type: string }> = {
  windows: { key: "builds/latest/installer/AXTO-Setup.exe", name: "AXTO-Setup.exe", type: "application/vnd.microsoft.portable-executable" },
  "linux-amd64": { key: "builds/latest/installer/axto-setup-linux-amd64", name: "axto-setup", type: "application/octet-stream" },
  "linux-arm64": { key: "builds/latest/installer/axto-setup-linux-arm64", name: "axto-setup", type: "application/octet-stream" },
  "macos-arm64": { key: "builds/latest/installer/axto-setup-macos-arm64", name: "axto-setup", type: "application/octet-stream" },
  sha256: { key: "builds/latest/installer/SHA256SUMS.txt", name: "SHA256SUMS.txt", type: "text/plain; charset=utf-8" },
};

async function serve(req: NextRequest) {
  const f = FILES[new URL(req.url).searchParams.get("os") || "windows"];
  if (!f) return new NextResponse("Unknown platform.", { status: 404 });
  const res = await serveBuild(req, f.key, { filename: f.name, type: f.type, cache: "public, max-age=300" });
  return res || new NextResponse("This download is being prepared. Please try again shortly.", { status: 404, headers: { "Cache-Control": "no-store" } });
}

export const GET = serve;
export const HEAD = serve;
