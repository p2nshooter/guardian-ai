/* /apps — overview of the seven cloud apps (static). */
import type { Metadata } from "next";
import AppGrid from "@/components/site/AppGrid";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Apps — Legal AI, Prompt Library, AI Studio, Clipper and more",
  description: "Seven professional AI apps in your browser: Legal AI, Prompt Library, AI Studio, Clipper, Privacy Vault, Compliance Center and Security Analyst — on your own AI keys.",
  path: "/apps",
});

export default function AppsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Apps", path: "/apps" }])} />
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50/60 to-white py-16">
        <div className="container-page">
          <p className="eyebrow">Apps</p>
          <h1 className="h-display mt-3 max-w-3xl">Seven AI apps. One workspace. No installation.</h1>
          <p className="lead mt-5 max-w-2xl">Each app is designed for a specific professional job, explains itself step by step, and runs on your own AI keys.</p>
        </div>
      </section>
      <section className="py-14"><div className="container-page"><AppGrid /></div></section>
    </>
  );
}
