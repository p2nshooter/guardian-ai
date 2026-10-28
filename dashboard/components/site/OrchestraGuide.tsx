/* "What Orchestra AI is" and the usage guide on /self-hosted/orchestra (REQUESTS 115,
 * BLUEPRINT-V4 §31): the GPU worker explained, a live-looking request flow, eight
 * steps with real screenshots of the console, and a recording of the walkthrough.
 * The flow animation is CSS and stops for people who ask for reduced motion. */
"use client";
import { useI18n } from "@/lib/i18n";
import { orchGuide } from "@/lib/orchestra-copy";

const SHOTS = "/guides/orchestra/";

export default function OrchestraGuide() {
  const { lang } = useI18n();
  const g = orchGuide(lang);
  return (
    <section id="guide" className="scroll-mt-24 py-16" data-testid="sh-orchestra-guide">
      <div className="container-page">
        <div className="max-w-3xl">
          <h2 className="h-section">{g.whatTitle}</h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-slate-700">
            {g.what.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8" data-testid="orch-flow">
          <h3 className="text-lg font-bold text-slate-900">{g.flowTitle}</h3>
          <div className="mt-6 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            {[g.flow.you, g.flow.core, g.flow.cloud + " · " + g.flow.gpu].map((label, i, all) => (
              <div key={i} className="contents">
                <div className={`flex-1 rounded-xl border p-4 text-center text-sm font-semibold ${i === 1 ? "border-brand-600 bg-white text-brand-700 shadow-sm" : "border-slate-200 bg-white text-slate-800"}`}>{label}</div>
                {i < all.length - 1 ? (
                  <div className="orch-track relative mx-auto h-8 w-px bg-slate-300 md:mx-0 md:h-px md:w-auto md:flex-1" aria-hidden="true">
                    <span className="orch-dot hidden md:block" style={{ animationDelay: `${i * 1.2}s` }} />
                    <span className="orch-dot orch-dot-back hidden md:block" style={{ animationDelay: `${i * 1.2 + 1.6}s` }} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-slate-600">{g.flow.note}</p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{g.gpuTitle}</h3>
            <div className="mt-4 space-y-4 text-slate-700">{g.gpu.map((p, i) => <p key={i}>{p}</p>)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900">{g.gpuCheckTitle}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{g.gpuCheck}</p>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-ink-900 p-4 text-[13px] text-slate-100"><code>{"ollama run llama3.2\nollama ps\n\nNAME        ID      SIZE     PROCESSOR    UNTIL\nllama3.2    a80c…   4.0 GB   100% GPU     4 minutes from now"}</code></pre>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="h-section">{g.stepsTitle}</h2>
          <ol className="mt-8 space-y-10">
            {g.steps.map((st, i) => (
              <li key={i} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-start" data-testid={`orch-step-${i + 1}`}>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                    <h3 className="text-xl font-bold text-slate-900">{st.title}</h3>
                  </div>
                  <p className="mt-3 text-slate-700">{st.text}</p>
                </div>
                {st.shot ? (
                  <figure>
                    <img src={SHOTS + st.shot} alt={st.shotAlt || st.title} width={1280} height={800} loading="lazy"
                      className="w-full rounded-xl border border-slate-200 shadow-sm" />
                    <figcaption className="mt-2 text-xs text-slate-500">{st.shotAlt}</figcaption>
                  </figure>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-16">
          <h2 className="h-section">{g.videoTitle}</h2>
          <p className="mt-3 max-w-3xl text-slate-600">{g.videoLead}</p>
          <video className="mt-6 w-full rounded-2xl border border-slate-200 bg-ink-900 shadow-sm" controls playsInline preload="metadata"
            poster={SHOTS + "walkthrough-poster.jpg"} aria-label={g.videoTitle} data-testid="orch-video">
            <source src={SHOTS + "walkthrough.mp4"} type="video/mp4" />
          </video>
          <p className="mt-3 text-sm text-slate-500">{g.editionsNote}</p>
        </div>
      </div>
    </section>
  );
}
