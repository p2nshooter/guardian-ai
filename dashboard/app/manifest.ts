/* Web app manifest — makes axto.io installable on phones and desktops
 * ("Add to Home screen" / "Install app"): opens full-screen without the
 * browser bar, straight into the member portal. */
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?app=axto",
    name: SITE.isPreview ? "AXTO (preview)" : "AXTO — AI workspace",
    short_name: "AXTO",
    description: SITE.description,
    lang: "en",
    dir: "ltr",
    start_url: "/app?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#07090d",
    theme_color: "#07090d",
    categories: ["productivity", "business", "utilities"],
    // Lets Chrome tell the page that this app is already installed, so the install bar hides itself.
    related_applications: [{ platform: "webapp", url: `${SITE.url}/manifest.webmanifest` }],
    prefer_related_applications: false,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Legal AI", short_name: "Legal", url: "/app/legal?source=pwa", icons: [{ src: "/shortcut-legal.png", sizes: "96x96", type: "image/png" }] },
      { name: "Prompt Library", short_name: "Prompts", url: "/app/prompts?source=pwa", icons: [{ src: "/shortcut-prompts.png", sizes: "96x96", type: "image/png" }] },
      { name: "Plan & billing", short_name: "Billing", url: "/app/billing?source=pwa", icons: [{ src: "/shortcut-billing.png", sizes: "96x96", type: "image/png" }] },
      { name: "Support", short_name: "Support", url: "/contact?source=pwa", icons: [{ src: "/shortcut-support.png", sizes: "96x96", type: "image/png" }] },
    ],
  };
}
