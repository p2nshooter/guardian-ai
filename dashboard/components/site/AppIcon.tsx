/* One line icon per app (docs/BLUEPRINT-V4.md §18): the same shapes as the
 * owner's "AXTO Digital Global" picture — shield, note, padlock, globe, target,
 * clipboard, factory, virus, brain, scales — drawn crisp at any size. */
import {
  Brain, Clapperboard, ClipboardCheck, ClipboardList, Crosshair, Factory, FileLock2, Globe, Library, LockKeyhole,
  Music2, Scale, ScanSearch, ShieldCheck, Sparkles, type LucideIcon, type LucideProps,
} from "lucide-react";

function Virus(props: LucideProps) {
  const { size = 24, strokeWidth = 2, className, ...rest } = props;
  const spikes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...(rest as object)}>
      <circle cx="12" cy="12" r="5" />
      {spikes.map((a, i) => {
        const x1 = 12 + Math.cos(a) * 5, y1 = 12 + Math.sin(a) * 5, x2 = 12 + Math.cos(a) * 8.6, y2 = 12 + Math.sin(a) * 8.6;
        return <g key={i}><path d={`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`} /><circle cx={(12 + Math.cos(a) * 9.6).toFixed(2)} cy={(12 + Math.sin(a) * 9.6).toFixed(2)} r="1" /></g>;
      })}
      <circle cx="10.4" cy="10.6" r=".8" /><circle cx="13.6" cy="13.2" r=".8" />
    </svg>
  );
}

/** Icons of the 10 self-hosted apps, by slug. */
export const SELF_HOSTED_ICONS: Record<string, LucideIcon | typeof Virus> = {
  guardian: ShieldCheck, orchestra: Music2, vault: LockKeyhole, edge: Globe, soc: Crosshair,
  compliance: ClipboardList, sentinel: Factory, antivirus: Virus, studio: Brain, legal: Scale,
};
/** Icons of the 7 cloud apps, by slug. */
export const CLOUD_ICONS: Record<string, LucideIcon> = {
  legal: Scale, prompts: Library, studio: Sparkles, clipper: Clapperboard, vault: FileLock2, compliance: ClipboardCheck, security: ScanSearch,
};

export default function AppIcon({ slug, kind, size = 22, className = "" }: { slug: string; kind: "cloud" | "self"; size?: number; className?: string }) {
  const Icon = (kind === "cloud" ? CLOUD_ICONS[slug] : SELF_HOSTED_ICONS[slug]) || Sparkles;
  return <Icon size={size} strokeWidth={1.8} className={className} aria-hidden="true" />;
}
