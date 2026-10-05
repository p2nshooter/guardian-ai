/* The "One Ecosystem" globe (docs/BLUEPRINT-V4.md §18.3): a sapphire wireframe
 * sphere whose meridians turn, city lights crossing its front face and two
 * satellites on gilded orbits. Pure SVG + CSS (app/globals.css "globe-*"),
 * no script and no image weight; static under prefers-reduced-motion. */

const R = 150;
const C = 200;
const TURN = 36; // seconds per rotation (globe-city); meridians repeat every half turn
const LATS = [-60, -30, 0, 30, 60];
const MERIDIANS = 6;
// [latitude°, longitude°] — roughly the cities where AXTO's languages are spoken.
const CITIES: [number, number][] = [
  [-6, 107], [3, 101], [52, 13], [48, 2], [41, 12], [39, 116], [35, 139], [28, 77], [24, 46], [51, 0], [40, -74], [-23, -46], [1, 103], [30, 31],
];
const rad = (d: number) => (d * Math.PI) / 180;
const r1 = (n: number) => Math.round(n * 10) / 10;

export default function PalaceGlobe({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="pg-core" cx="36%" cy="30%" r="78%">
          <stop offset="0" stopColor="#2b5fd9" stopOpacity=".55" />
          <stop offset=".55" stopColor="#0d1f4d" stopOpacity=".85" />
          <stop offset="1" stopColor="#050a18" />
        </radialGradient>
        <radialGradient id="pg-halo" cx="50%" cy="50%" r="50%">
          <stop offset=".72" stopColor="#2f82ff" stopOpacity="0" />
          <stop offset=".8" stopColor="#2f82ff" stopOpacity=".35" />
          <stop offset="1" stopColor="#2f82ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pg-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9a24a" stopOpacity="0" />
          <stop offset=".5" stopColor="#f3d98b" />
          <stop offset="1" stopColor="#c9a24a" stopOpacity="0" />
        </linearGradient>
        <clipPath id="pg-clip"><circle cx={C} cy={C} r={R} /></clipPath>
      </defs>

      <circle className="globe-halo" cx={C} cy={C} r={R + 40} fill="url(#pg-halo)" />
      <circle cx={C} cy={C} r={R} fill="url(#pg-core)" />

      <g clipPath="url(#pg-clip)" fill="none" stroke="#8cc5ff" strokeWidth=".8">
        {LATS.map((lat) => {
          const rx = R * Math.cos(rad(lat));
          return <ellipse key={lat} cx={C} cy={r1(C - R * Math.sin(rad(lat)))} rx={r1(rx)} ry={r1(rx * 0.14)} strokeOpacity={lat === 0 ? 0.45 : 0.22} />;
        })}
        {Array.from({ length: MERIDIANS }, (_, k) => (
          <ellipse key={k} className="globe-meridian" cx={C} cy={C} rx={R} ry={R} strokeOpacity=".28"
            style={{ animationDelay: `${-((k / MERIDIANS) * (TURN / 2)).toFixed(2)}s`, transform: `scaleX(${Math.abs(Math.sin(rad((k * 180) / MERIDIANS))).toFixed(3)})` }} />
        ))}
        {CITIES.map(([lat, lon], i) => {
          const rx = R * Math.cos(rad(lat));
          const y = C - R * Math.sin(rad(lat));
          const front = Math.cos(rad(lon)) >= 0;
          return (
            <g key={i} className={`globe-city${front ? "" : " globe-city-back"}`}
              style={{ ["--rx" as string]: r1(rx), ["--sx" as string]: r1(rx * Math.sin(rad(lon))), animationDelay: `${(-(((lon + 90 + 360) % 360) / 360) * TURN).toFixed(2)}s` }}>
              <circle cx={C} cy={r1(y)} r="5" fill="#56a4ff" fillOpacity=".18" stroke="none" />
              <circle cx={C} cy={r1(y)} r="1.9" fill={i % 4 === 0 ? "#f3d98b" : "#d9ebff"} stroke="none" />
            </g>
          );
        })}
      </g>

      <circle cx={C} cy={C} r={R} fill="none" stroke="#8cc5ff" strokeOpacity=".35" strokeWidth="1" />
      <path d={`M ${C - R * 0.62} ${C - R * 0.74} A ${R} ${R} 0 0 1 ${C + R * 0.2} ${C - R * 0.98}`} fill="none" stroke="#ffffff" strokeOpacity=".18" strokeWidth="2" strokeLinecap="round" />

      {/* Gilded orbits with travelling satellites. */}
      <g fill="none" transform={`rotate(-16 ${C} ${C})`}>
        <ellipse cx={C} cy={C} rx={R + 34} ry={44} stroke="url(#pg-gold)" strokeOpacity=".55" strokeWidth=".9" />
        <ellipse className="globe-orbit" cx={C} cy={C} rx={R + 34} ry={44} pathLength={1} stroke="#f3d98b" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <g fill="none" transform={`rotate(24 ${C} ${C})`}>
        <ellipse cx={C} cy={C} rx={R + 18} ry={30} stroke="#8cc5ff" strokeOpacity=".22" strokeWidth=".8" />
        <ellipse className="globe-orbit" cx={C} cy={C} rx={R + 18} ry={30} pathLength={1} stroke="#8cc5ff" strokeWidth="2" strokeLinecap="round" style={{ animationDuration: "10s", animationDelay: "-4s" }} />
      </g>
    </svg>
  );
}
