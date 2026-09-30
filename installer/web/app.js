// AXTO Setup — wizard UI. Talks only to the local installer on 127.0.0.1.
"use strict";
const params = new URLSearchParams(location.search);
const TOKEN = params.get("t") || sessionStorage.getItem("axto_t") || "";
sessionStorage.setItem("axto_t", TOKEN);
history.replaceState(null, "", location.pathname + location.hash);

const T = {
  en: { install: "Install", manage: "Manage apps", s1: "Check your computer", s2: "Licence key", s3: "Options", s4: "Install",
    h1: "Let's get your AXTO app running", p1: "AXTO apps run in Docker. On Windows that's Docker Desktop with WSL 2 — we check everything for you.",
    checking: "Checking…", recheck: "Check again", startDocker: "Start Docker Desktop", continue: "Continue", h2: "Enter your licence key",
    p2: "Find it in your member portal under Self-Hosted:", keyLabel: "Licence key", back: "Back", verify: "Verify key", port: "Port",
    portHint: "The app opens at http://localhost:PORT", access: "Access", lan: "Allow other computers on my network",
    lanHint: "Off = only this computer (recommended for laptops).", where: "Installs to", size: "download", installNow: "Install",
    installing: "Installing…", openApp: "Open the app", retry: "Try again", support: "Contact support", manageH: "Your AXTO apps",
    manageP: "Start, stop, update or remove apps installed on this computer. Updates keep your data and settings.",
    none: "No AXTO apps installed yet.", start: "Start", stop: "Stop", update: "Update", logs: "Logs", open: "Open", remove: "Uninstall",
    confirmRemove: "Uninstall {app}? Choose OK to also DELETE its data, Cancel to keep the data.", done: "{app} is running at {url}",
    upToDate: "Up to date", reinstall: "Reinstall / repair", valid: "Valid for {app} until {date}.",
    dockerOk: "Docker {v} is running", composeOk: "Docker Compose {v}", wslOk: "WSL 2 is enabled", wslBad: "WSL 2 is not enabled",
    res: "{gb} GB RAM · {cpu} CPUs available to Docker", lowRes: "Tip: give Docker at least 4 GB RAM (Docker Desktop → Settings → Resources).",
    keyHint: "Lifetime licence? Paste its installer key (LIFE-…) from axto.io/app/lifetime.", pick: "Which app do you want to install?",
    lifetimeOk: "Lifetime licence for {app} — updates included until {date}. This device is activated automatically." },
  id: { install: "Instal", manage: "Kelola aplikasi", s1: "Cek komputer", s2: "Kunci lisensi", s3: "Opsi", s4: "Instal",
    h1: "Mari jalankan aplikasi AXTO Anda", p1: "Aplikasi AXTO berjalan di Docker. Di Windows itu Docker Desktop dengan WSL 2 — semuanya kami cek untuk Anda.",
    checking: "Memeriksa…", recheck: "Cek lagi", startDocker: "Jalankan Docker Desktop", continue: "Lanjut", h2: "Masukkan kunci lisensi",
    p2: "Ada di portal member, menu Self-Hosted:", keyLabel: "Kunci lisensi", back: "Kembali", verify: "Verifikasi kunci", port: "Port",
    portHint: "Aplikasi dibuka di http://localhost:PORT", access: "Akses", lan: "Izinkan komputer lain di jaringan saya",
    lanHint: "Mati = hanya komputer ini (disarankan untuk laptop).", where: "Lokasi instalasi", size: "unduhan", installNow: "Instal",
    installing: "Menginstal…", openApp: "Buka aplikasi", retry: "Coba lagi", support: "Hubungi support", manageH: "Aplikasi AXTO Anda",
    manageP: "Jalankan, hentikan, perbarui, atau hapus aplikasi di komputer ini. Pembaruan tetap menyimpan data dan pengaturan.",
    none: "Belum ada aplikasi AXTO terinstal.", start: "Jalankan", stop: "Hentikan", update: "Perbarui", logs: "Log", open: "Buka", remove: "Uninstall",
    confirmRemove: "Uninstall {app}? Pilih OK untuk juga MENGHAPUS datanya, Cancel untuk menyimpan data.", done: "{app} berjalan di {url}",
    upToDate: "Terbaru", reinstall: "Instal ulang / perbaiki", valid: "Berlaku untuk {app} sampai {date}.",
    dockerOk: "Docker {v} berjalan", composeOk: "Docker Compose {v}", wslOk: "WSL 2 aktif", wslBad: "WSL 2 belum aktif",
    res: "{gb} GB RAM · {cpu} CPU tersedia untuk Docker", lowRes: "Tips: beri Docker minimal 4 GB RAM (Docker Desktop → Settings → Resources).",
    keyHint: "Lisensi Lifetime? Tempel kunci installer (LIFE-…) dari axto.io/app/lifetime.", pick: "Aplikasi mana yang ingin dipasang?",
    lifetimeOk: "Lisensi Lifetime untuk {app} — pembaruan termasuk sampai {date}. Perangkat ini diaktifkan otomatis." },
};
let lang = localStorage.getItem("axto_lang") || (/^(id|in)\b/i.test(navigator.language) ? "id" : "en");
const t = (k, v = {}) => (T[lang][k] || T.en[k] || k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "");
const $ = (s) => document.querySelector(s);
const show = (el, on) => el.classList.toggle("hidden", !on);

async function api(path, body) {
  const r = await fetch(path, { method: body === undefined ? "GET" : "POST", headers: { "X-Setup-Token": TOKEN, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
const openUrl = (url) => api("/api/open", { url }).catch(() => window.open(url, "_blank"));

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $("#lang").textContent = lang === "en" ? "ID" : "EN";
}

let info = null, licence = null, currentKey = "", currentApp = "";
function stepTo(n) {
  for (let i = 1; i <= 4; i++) show($(`#step${i}`), i === n);
  document.querySelectorAll("#steps li").forEach((li) => { const s = +li.dataset.step; li.className = s === n ? "on" : s < n ? "done" : ""; });
}
function view(v) {
  show($("#view-install"), v === "install"); show($("#view-manage"), v === "manage");
  document.querySelectorAll("nav .link[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  if (v === "manage") renderApps();
}

async function check() {
  $("#checks").innerHTML = `<li class="pending">${t("checking")}</li>`;
  show($("#fix"), false);
  info = await api("/api/info");
  $("#ver").textContent = "v" + info.version;
  const d = info.docker, items = [];
  if (d.os === "windows") items.push([d.wsl === "ok", d.wsl === "ok" ? t("wslOk") : t("wslBad")]);
  items.push([d.running, d.running ? t("dockerOk", { v: d.version }) : d.problem || "Docker"]);
  if (d.running) items.push([d.compose, d.compose ? t("composeOk", { v: d.compose_version }) : d.problem]);
  if (d.ready) items.push([true, t("res", { gb: d.memory_gb, cpu: d.cpus })]);
  $("#checks").innerHTML = items.map(([ok, txt]) => `<li class="${ok ? "ok" : "bad"}">${esc(txt)}</li>`).join("");
  if (!d.ready) {
    $("#fix").innerHTML = `${esc(d.fix || "")} ${d.fix_url ? `<a href="#" data-open="${esc(d.fix_url)}">${esc(d.fix_url)}</a>` : ""}`;
    show($("#fix"), true);
  } else if (d.memory_gb && d.memory_gb < 4) { $("#fix").textContent = t("lowRes"); show($("#fix"), true); }
  show($("#startDocker"), d.os === "windows" && d.installed && !d.running && !!d.desktop_path);
  $("#next1").disabled = !d.ready;
  return d.ready;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function verifyKey() {
  show($("#keyErr"), false); show($("#keyOk"), false);
  const key = $("#key").value.trim().toUpperCase();
  if (key !== currentKey) { currentKey = key; currentApp = ""; show($("#pickBox"), false); }
  if (!$("#pickBox").classList.contains("hidden")) currentApp = $("#pick").value;
  $("#next2").disabled = true;
  try {
    licence = await api("/api/licence", { key: currentKey, app: currentApp });
    if (licence.choose) {
      // Lifetime suite: pick the app, then verify again.
      $("#pick").innerHTML = licence.choose.map((c) => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join("");
      show($("#pickBox"), true);
      $("#next2").disabled = false;
      return;
    }
    const p = licence.product;
    currentApp = p.Slug;
    $("#keyOk").textContent = t(licence.lifetime ? "lifetimeOk" : "valid", { app: p.Name, date: (licence.expires_at || "").slice(0, 10) });
    show($("#keyOk"), true);
    $("#h3").textContent = p.Name;
    $("#note3").textContent = (info.docker.os === "windows" && p.WindowsNote) ? p.WindowsNote : p.Note;
    $("#port").value = licence.installed ? licence.installed.port : p.Port;
    $("#lan").checked = licence.installed ? licence.installed.lan : info.docker.os === "linux";
    $("#where").textContent = licence.installed ? licence.installed.dir : `${info.base}${info.docker.os === "windows" ? "\\" : "/"}${p.Slug}`;
    $("#size").textContent = licence.download;
    $("#next3").textContent = licence.installed ? t("reinstall") : t("installNow");
    setTimeout(() => stepTo(3), 500);
  } catch (e) { $("#keyErr").textContent = e.message; show($("#keyErr"), true); }
  $("#next2").disabled = false;
}

async function follow(jobId, logEl, onEnd) {
  for (;;) {
    let j;
    try { j = await api(`/api/jobs/${jobId}`); } catch (e) { await sleep(1000); continue; }
    if (logEl) logEl.textContent = j.lines.join("\n");
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
    $("#bar").style.width = j.percent + "%";
    $("#stepText").textContent = j.step || "";
    if (j.status !== "running") return onEnd(j);
    await sleep(700);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function install() {
  stepTo(4);
  show($("#done"), false); show($("#failed"), false);
  $("#h4").textContent = t("installing"); $("#log").textContent = ""; $("#bar").style.width = "0";
  try {
    const { job } = await api("/api/install", { key: currentKey, app: currentApp, port: +$("#port").value, lan: $("#lan").checked });
    await follow(job, $("#log"), (j) => {
      if (j.status === "done") {
        $("#h4").textContent = "✔ " + licence.product.Name;
        $("#doneText").textContent = t("done", { app: licence.product.Name, url: j.url });
        $("#openApp").onclick = () => openUrl(j.url);
        show($("#done"), true);
        openUrl(j.url);
      } else { $("#failText").textContent = j.error; show($("#failed"), true); }
    });
  } catch (e) { $("#failText").textContent = e.message; show($("#failed"), true); }
}

async function renderApps() {
  const i = await api("/api/info");
  const apps = i.products.filter((p) => p.installed);
  $("#apps").innerHTML = apps.length ? apps.map((p) => `
    <div class="app" data-slug="${p.Slug}">
      <div><div class="name">${esc(p.Name)}</div><div class="meta">http://localhost:${p.installed.port} · ${esc(p.installed.dir)} · ${esc(p.installed.key_tail)}</div></div>
      <div class="acts">
        <button class="btn primary" data-act="open">${t("open")}</button>
        <button class="btn secondary" data-act="start">${t("start")}</button>
        <button class="btn secondary" data-act="stop">${t("stop")}</button>
        <button class="btn secondary" data-act="update">${t("update")}</button>
        <button class="btn secondary" data-act="logs">${t("logs")}</button>
        <button class="btn danger" data-act="remove">${t("remove")}</button>
      </div></div>`).join("") : `<p class="muted">${t("none")}</p>`;
}

document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-open],[data-view],[data-back],[data-act]");
  if (!el) return;
  e.preventDefault();
  if (el.dataset.open) return openUrl(el.dataset.open);
  if (el.dataset.view) return view(el.dataset.view);
  if (el.dataset.back) return stepTo(+el.dataset.back);
  const row = el.closest(".app"), slug = row?.dataset.slug, act = el.dataset.act, log = $("#mlog");
  if (!slug) return;
  const p = (await api("/api/info")).products.find((x) => x.Slug === slug);
  if (act === "open") return openUrl(`http://localhost:${p.installed.port}/`);
  show(log, true); log.textContent = "…";
  try {
    if (act === "remove") {
      const wipe = confirm(t("confirmRemove", { app: p.Name }));
      await api(`/api/apps/${slug}/${wipe ? "uninstall" : "uninstall-keep"}`, {});
      log.textContent = "✔"; return renderApps();
    }
    const r = await api(`/api/apps/${slug}/${act}`, {});
    if (r.job) await follow(r.job, log, (j) => { log.textContent = j.lines.join("\n") + (j.error ? "\n✖ " + j.error : "\n✔"); });
    else log.textContent = r.output || "✔";
  } catch (err) { log.textContent = "✖ " + err.message; }
  renderApps();
});

$("#lang").onclick = () => { lang = lang === "en" ? "id" : "en"; localStorage.setItem("axto_lang", lang); applyLang(); };
$("#recheck").onclick = () => check();
$("#startDocker").onclick = async () => { await api("/api/docker/start", {}); $("#checks").innerHTML = `<li class="pending">${t("checking")}</li>`; for (let i = 0; i < 40; i++) { await sleep(3000); if (await check()) break; } };
$("#next1").onclick = () => stepTo(2);
$("#next2").onclick = verifyKey;
$("#key").addEventListener("keydown", (e) => { if (e.key === "Enter") verifyKey(); });
$("#next3").onclick = install;
$("#retry").onclick = install;
setInterval(() => api("/api/info").catch(() => {}), 60000);

applyLang();
view(location.hash === "#manage" ? "manage" : "install");
stepTo(1);
check().catch((e) => { $("#checks").innerHTML = `<li class="bad">${esc(e.message)}</li>`; });
