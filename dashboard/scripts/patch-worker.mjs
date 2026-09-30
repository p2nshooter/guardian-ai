// AXTO — post-build patch for @cloudflare/next-on-pages output.
// The generated router re-creates every response (`new Response(res.body, {...res})`)
// to apply headers, which drops the `webSocket` of a 101 Switching Protocols
// response — so WebSocket route handlers (/api/v1/ws) cannot work. This patch
// passes such responses through untouched. It is idempotent and fails loudly
// if the pattern is missing, so an upgrade of next-on-pages is noticed.
import fs from "node:fs";
import path from "node:path";

const file = path.resolve(process.cwd(), ".vercel/output/static/_worker.js/index.js");
let src = fs.readFileSync(file, "utf8");
if (src.includes("/*axto-ws*/")) { console.log("patch-worker: already applied"); process.exit(0); }
let n = 0;
// 1) l=new Response(l.body,{...l,status:…,headers:…})  →  keep l when it carries a WebSocket
src = src.replace(/(\b[A-Za-z_$][\w$]*)=new Response\(\1\.body,\{\.\.\.\1,/g, (m, v) => { n++; return `${v}=/*axto-ws*/${v}.webSocket?${v}:new Response(${v}.body,{...${v},`; });
// 2) function j(e){return new Response(e.body,e)}  →  same guard
src = src.replace(/function ([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*)\)\{return new Response\(\2\.body,\2\)\}/g, (m, f, a) => { n++; return `function ${f}(${a}){return ${a}.webSocket?${a}:new Response(${a}.body,${a})}`; });
if (!n) { console.error("patch-worker: pattern not found — WebSockets (/api/v1/ws) would not work with this next-on-pages version"); process.exit(1); }
fs.writeFileSync(file, src);
console.log(`patch-worker: WebSocket pass-through applied (${n} site${n === 1 ? "" : "s"})`);
