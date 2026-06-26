// Disclaimer content + render tests. node --experimental-strip-types dashboard/tests/test-disclaimer.mjs
import { DISCLAIMER, DISCLAIMER_VERSION, disclaimerShort, renderDisclaimerText } from "../lib/disclaimer.ts";
const R=[];const ok=(n,c)=>R.push({n,ok:!!c});
ok("version set", typeof DISCLAIMER_VERSION==="string" && DISCLAIMER_VERSION.length>0);
for(const lang of ["en","id"]){
  const t=renderDisclaimerText(lang);
  ok(`${lang}: assistive-only stated`, /assist|alat bantu/i.test(t));
  ok(`${lang}: decisions rest with user`, /your sole|sole discretion|kewenangan dan risiko|keputusan/i.test(t));
  ok(`${lang}: no liability for AXTO+Yusron`, /not be liable|tidak bertanggung jawab/i.test(t) && /Yusron Efendi/.test(t) && /axto\.io/.test(t));
  ok(`${lang}: as-is`, /as is|sebagaimana adanya/i.test(t));
  ok(`${lang}: must agree clause present`, DISCLAIMER[lang].agree.length>40);
  ok(`${lang}: version embedded`, t.includes(DISCLAIMER_VERSION));
  ok(`${lang}: short version mentions no liability`, /no liability|tidak bertanggung jawab/i.test(disclaimerShort(lang)));
  ok(`${lang}: has >=7 clauses`, DISCLAIMER[lang].clauses.length>=7);
}
const passed=R.filter(r=>r.ok).length,failed=R.length-passed;
for(const r of R) if(!r.ok) console.log("FAIL:",r.n);
console.log(`\nDISCLAIMER: ${passed}/${R.length} passed, ${failed} failed`);
process.exit(failed===0?0:1);
