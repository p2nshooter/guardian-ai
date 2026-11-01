/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * Orchestra AI and its GPU worker, in plain words (REQUESTS 115, BLUEPRINT-V4 §31).
 * Everything here describes what the product does today. Editions and prices are
 * NOT written here: they come from the live edition table (lib/editions.ts,
 * /api/editions), so an admin change shows on the homepage at once.
 *
 * The homepage spotlight is in all ten languages. The usage guide is in English and
 * Indonesian for now; the other languages fall back to English until translated.
 * ============================================================================ */
import type { Lang } from "./i18n-shared";

export interface OrchestraSpot {
  title: string; lead: string;
  gpuTitle: string; gpuLead: string;
  perk1: string; perk2: string; perk3: string; perk4: string;
  priceTitle: string; perMonth: string; perYear: string;
  workers: string;      // "up to {n} workers"
  unlimited: string;
  gpuIncluded: string;
  buy: string; guide: string; loading: string;
}

export const ORCH_SPOT: Record<Lang, OrchestraSpot> = {
  en: {
    title: "Orchestra AI: one console for your AI and your GPU",
    lead: "Orchestra AI runs your AI workers on your own computer or server. Keep provider keys in an encrypted vault, add CPU workers for cloud models and GPU workers for models on your own graphics card, then follow load, queue and cost live.",
    gpuTitle: "GPU worker: your graphics card runs AI privately",
    gpuLead: "A GPU worker runs open models (Llama, Qwen, Mistral and more, through Ollama) on the graphics card you already own. Prompts stay on your hardware, and there is no per-token fee.",
    perk1: "Finds every GPU brand; NVIDIA (Windows and Linux) and AMD (Linux) run in the GPU worker, other cards through Ollama.",
    perk2: "Auto-Scale starts and stops real GPU workers — one per card, on the freest GPU, even from zero — within your licence.",
    perk3: "Hot GPUs are paused and jobs move to the coolest card.",
    perk4: "Keys stay in the encrypted vault; answers stay on your hardware.",
    priceTitle: "Price", perMonth: "per month", perYear: "per year",
    workers: "up to {n} workers", unlimited: "unlimited workers",
    gpuIncluded: "The GPU worker is included in every Orchestra AI edition.",
    buy: "Get Orchestra AI", guide: "How it works and how to use it", loading: "Loading prices…",
  },
  id: {
    title: "Orchestra AI: satu konsol untuk AI dan GPU Anda",
    lead: "Orchestra AI menjalankan worker AI Anda di komputer atau server sendiri. Simpan kunci penyedia di vault terenkripsi, tambahkan worker CPU untuk model cloud dan worker GPU untuk model di kartu grafis Anda, lalu pantau beban, antrean dan biaya secara langsung.",
    gpuTitle: "Worker GPU: kartu grafis Anda menjalankan AI secara pribadi",
    gpuLead: "Worker GPU menjalankan model terbuka (Llama, Qwen, Mistral dan lainnya, lewat Ollama) di kartu grafis yang sudah Anda miliki. Prompt tetap di perangkat Anda, tanpa biaya per token.",
    perk1: "Mengenali semua merek GPU; NVIDIA (Windows dan Linux) dan AMD (Linux) berjalan di worker GPU, kartu lain lewat Ollama.",
    perk2: "Auto-Scale menyalakan dan menghentikan worker GPU sungguhan — satu per kartu, di GPU paling longgar, bahkan dari nol — dalam batas lisensi Anda.",
    perk3: "GPU yang panas dijeda dan pekerjaan pindah ke kartu yang lebih dingin.",
    perk4: "Kunci tetap di vault terenkripsi; jawaban tetap di perangkat Anda.",
    priceTitle: "Harga", perMonth: "per bulan", perYear: "per tahun",
    workers: "hingga {n} worker", unlimited: "worker tanpa batas",
    gpuIncluded: "Worker GPU sudah termasuk di setiap edisi Orchestra AI.",
    buy: "Dapatkan Orchestra AI", guide: "Cara kerja dan cara memakainya", loading: "Memuat harga…",
  },
  ms: {
    title: "Orchestra AI: satu konsol untuk AI dan GPU anda",
    lead: "Orchestra AI menjalankan worker AI anda pada komputer atau pelayan sendiri. Simpan kunci pembekal dalam vault yang disulitkan, tambah worker CPU untuk model awan dan worker GPU untuk model pada kad grafik anda, kemudian pantau beban, giliran dan kos secara langsung.",
    gpuTitle: "Worker GPU: kad grafik anda menjalankan AI secara peribadi",
    gpuLead: "Worker GPU menjalankan model terbuka (Llama, Qwen, Mistral dan lain-lain, melalui Ollama) pada kad grafik yang anda sudah miliki. Prompt kekal pada perkakasan anda, tanpa bayaran setiap token.",
    perk1: "Mengesan semua jenama GPU; NVIDIA (Windows dan Linux) dan AMD (Linux) berjalan dalam worker GPU, kad lain melalui Ollama.",
    perk2: "Auto-Scale memulakan dan menghentikan worker GPU sebenar — satu bagi setiap kad, pada GPU paling lapang, malah dari sifar — dalam had lesen anda.",
    perk3: "GPU yang panas dijeda dan kerja berpindah ke kad yang lebih sejuk.",
    perk4: "Kunci kekal dalam vault yang disulitkan; jawapan kekal pada perkakasan anda.",
    priceTitle: "Harga", perMonth: "sebulan", perYear: "setahun",
    workers: "sehingga {n} worker", unlimited: "worker tanpa had",
    gpuIncluded: "Worker GPU termasuk dalam setiap edisi Orchestra AI.",
    buy: "Dapatkan Orchestra AI", guide: "Cara ia berfungsi dan cara menggunakannya", loading: "Memuatkan harga…",
  },
  de: {
    title: "Orchestra AI: eine Konsole für Ihre KI und Ihre GPU",
    lead: "Orchestra AI betreibt Ihre KI-Worker auf Ihrem eigenen Rechner oder Server. Bewahren Sie Anbieterschlüssel in einem verschlüsselten Tresor auf, fügen Sie CPU-Worker für Cloud-Modelle und GPU-Worker für Modelle auf Ihrer Grafikkarte hinzu und verfolgen Sie Last, Warteschlange und Kosten live.",
    gpuTitle: "GPU-Worker: Ihre Grafikkarte betreibt KI privat",
    gpuLead: "Ein GPU-Worker führt offene Modelle (Llama, Qwen, Mistral u. a., über Ollama) auf der Grafikkarte aus, die Sie bereits besitzen. Prompts bleiben auf Ihrer Hardware, ohne Gebühr pro Token.",
    perk1: "Erkennt jede GPU-Marke; NVIDIA (Windows und Linux) und AMD (Linux) laufen im GPU-Worker, andere Karten über Ollama.",
    perk2: "Auto-Scale startet und stoppt echte GPU-Worker — einen pro Karte, auf der freiesten GPU, sogar von null an — innerhalb Ihrer Lizenz.",
    perk3: "Heiße GPUs werden pausiert, Aufträge wandern zur kühlsten Karte.",
    perk4: "Schlüssel bleiben im verschlüsselten Tresor, Antworten auf Ihrer Hardware.",
    priceTitle: "Preis", perMonth: "pro Monat", perYear: "pro Jahr",
    workers: "bis zu {n} Worker", unlimited: "unbegrenzte Worker",
    gpuIncluded: "Der GPU-Worker ist in jeder Orchestra-AI-Edition enthalten.",
    buy: "Orchestra AI erhalten", guide: "So funktioniert es und so nutzen Sie es", loading: "Preise werden geladen…",
  },
  fr: {
    title: "Orchestra AI : une console pour votre IA et votre GPU",
    lead: "Orchestra AI fait tourner vos workers IA sur votre propre ordinateur ou serveur. Gardez vos clés de fournisseurs dans un coffre chiffré, ajoutez des workers CPU pour les modèles cloud et des workers GPU pour les modèles sur votre carte graphique, puis suivez la charge, la file et les coûts en direct.",
    gpuTitle: "Worker GPU : votre carte graphique fait tourner l'IA en privé",
    gpuLead: "Un worker GPU exécute des modèles ouverts (Llama, Qwen, Mistral et d'autres, via Ollama) sur la carte graphique que vous possédez déjà. Les prompts restent sur votre matériel, sans frais par jeton.",
    perk1: "Détecte toutes les marques de GPU ; NVIDIA (Windows et Linux) et AMD (Linux) tournent dans le worker GPU, les autres cartes via Ollama.",
    perk2: "Auto-Scale démarre et arrête de vrais workers GPU — un par carte, sur le GPU le plus libre, même à partir de zéro — dans les limites de votre licence.",
    perk3: "Les GPU trop chauds sont mis en pause et les tâches passent à la carte la plus fraîche.",
    perk4: "Les clés restent dans le coffre chiffré ; les réponses restent sur votre matériel.",
    priceTitle: "Prix", perMonth: "par mois", perYear: "par an",
    workers: "jusqu'à {n} workers", unlimited: "workers illimités",
    gpuIncluded: "Le worker GPU est inclus dans chaque édition d'Orchestra AI.",
    buy: "Obtenir Orchestra AI", guide: "Comment ça marche et comment l'utiliser", loading: "Chargement des prix…",
  },
  it: {
    title: "Orchestra AI: una console per la tua IA e la tua GPU",
    lead: "Orchestra AI gestisce i tuoi worker IA sul tuo computer o server. Conserva le chiavi dei provider in un vault cifrato, aggiungi worker CPU per i modelli cloud e worker GPU per i modelli sulla tua scheda grafica, e segui carico, coda e costi in tempo reale.",
    gpuTitle: "Worker GPU: la tua scheda grafica esegue l'IA in privato",
    gpuLead: "Un worker GPU esegue modelli aperti (Llama, Qwen, Mistral e altri, tramite Ollama) sulla scheda grafica che possiedi già. I prompt restano sul tuo hardware, senza costi per token.",
    perk1: "Rileva ogni marca di GPU; NVIDIA (Windows e Linux) e AMD (Linux) girano nel worker GPU, le altre schede tramite Ollama.",
    perk2: "Auto-Scale avvia e ferma veri worker GPU — uno per scheda, sulla GPU più libera, anche da zero — entro la tua licenza.",
    perk3: "Le GPU surriscaldate vengono messe in pausa e i job passano alla scheda più fresca.",
    perk4: "Le chiavi restano nel vault cifrato; le risposte restano sul tuo hardware.",
    priceTitle: "Prezzo", perMonth: "al mese", perYear: "all'anno",
    workers: "fino a {n} worker", unlimited: "worker illimitati",
    gpuIncluded: "Il worker GPU è incluso in ogni edizione di Orchestra AI.",
    buy: "Ottieni Orchestra AI", guide: "Come funziona e come usarlo", loading: "Caricamento prezzi…",
  },
  zh: {
    title: "Orchestra AI：一个控制台管理您的 AI 与 GPU",
    lead: "Orchestra AI 在您自己的电脑或服务器上运行 AI 工作节点。将服务商密钥保存在加密保险库中，为云端模型添加 CPU 工作节点，为显卡上的模型添加 GPU 工作节点，并实时查看负载、队列和成本。",
    gpuTitle: "GPU 工作节点：用您的显卡私密运行 AI",
    gpuLead: "GPU 工作节点通过 Ollama 在您已有的显卡上运行开源模型（Llama、Qwen、Mistral 等）。提示词留在您的硬件上，无需按 token 付费。",
    perk1: "识别所有显卡品牌；NVIDIA（Windows 与 Linux）和 AMD（Linux）在 GPU 工作节点中运行，其他显卡通过 Ollama 运行。",
    perk2: "Auto-Scale 启动和停止真实的 GPU 工作节点——每张卡一个、放在最空闲的 GPU 上，甚至可从零开始——并在您的授权范围内运行。",
    perk3: "过热的 GPU 会暂停，任务转移到更凉爽的显卡。",
    perk4: "密钥保存在加密保险库中，回答留在您的硬件上。",
    priceTitle: "价格", perMonth: "每月", perYear: "每年",
    workers: "最多 {n} 个工作节点", unlimited: "工作节点不限",
    gpuIncluded: "每个 Orchestra AI 版本都包含 GPU 工作节点。",
    buy: "获取 Orchestra AI", guide: "工作原理与使用方法", loading: "正在加载价格…",
  },
  ja: {
    title: "Orchestra AI：AI と GPU を一つのコンソールで",
    lead: "Orchestra AI は、お使いのパソコンやサーバー上で AI ワーカーを動かします。プロバイダーのキーは暗号化された金庫に保存し、クラウドモデル用に CPU ワーカー、お持ちのグラフィックカードのモデル用に GPU ワーカーを追加して、負荷・キュー・コストをリアルタイムで確認できます。",
    gpuTitle: "GPU ワーカー：お持ちのグラフィックカードで非公開の AI を",
    gpuLead: "GPU ワーカーは、既にお持ちのグラフィックカードで（Ollama を通じて）オープンなモデル（Llama、Qwen、Mistral など）を動かします。プロンプトはお手元のハードウェアに留まり、トークン課金はありません。",
    perk1: "すべての GPU ブランドを検出。NVIDIA（Windows・Linux）と AMD（Linux）は GPU ワーカーで、その他のカードは Ollama で動作。",
    perk2: "Auto-Scale が本物の GPU ワーカーを起動・停止。カード 1 枚に 1 つ、最も空いている GPU に、ゼロからでも。ライセンスの範囲内で動作。",
    perk3: "高温の GPU は一時停止し、ジョブは最も涼しいカードへ移動。",
    perk4: "キーは暗号化された金庫に、回答はお手元のハードウェアに留まります。",
    priceTitle: "価格", perMonth: "/ 月", perYear: "/ 年",
    workers: "ワーカー最大 {n} 台", unlimited: "ワーカー数無制限",
    gpuIncluded: "GPU ワーカーは Orchestra AI のすべてのエディションに含まれます。",
    buy: "Orchestra AI を入手", guide: "仕組みと使い方", loading: "価格を読み込み中…",
  },
  hi: {
    title: "Orchestra AI: आपकी AI और GPU के लिए एक कंसोल",
    lead: "Orchestra AI आपके अपने कंप्यूटर या सर्वर पर AI वर्कर चलाता है। प्रदाता की कुंजियाँ एन्क्रिप्टेड वॉल्ट में रखें, क्लाउड मॉडल के लिए CPU वर्कर और अपने ग्राफ़िक्स कार्ड पर चलने वाले मॉडल के लिए GPU वर्कर जोड़ें, और लोड, कतार और लागत को लाइव देखें।",
    gpuTitle: "GPU वर्कर: आपका ग्राफ़िक्स कार्ड निजी तौर पर AI चलाता है",
    gpuLead: "GPU वर्कर आपके पास मौजूद ग्राफ़िक्स कार्ड पर (Ollama के ज़रिए) खुले मॉडल (Llama, Qwen, Mistral और अन्य) चलाता है। प्रॉम्प्ट आपके हार्डवेयर पर रहते हैं और प्रति टोकन कोई शुल्क नहीं।",
    perk1: "हर GPU ब्रांड पहचानता है; NVIDIA (Windows और Linux) और AMD (Linux) GPU वर्कर में चलते हैं, बाकी कार्ड Ollama के ज़रिए।",
    perk2: "Auto-Scale असली GPU वर्कर चालू और बंद करता है — हर कार्ड पर एक, सबसे खाली GPU पर, शून्य से भी — आपके लाइसेंस के भीतर।",
    perk3: "गर्म GPU रोक दिए जाते हैं और कार्य सबसे ठंडे कार्ड पर चले जाते हैं।",
    perk4: "कुंजियाँ एन्क्रिप्टेड वॉल्ट में, उत्तर आपके हार्डवेयर पर।",
    priceTitle: "कीमत", perMonth: "प्रति माह", perYear: "प्रति वर्ष",
    workers: "अधिकतम {n} वर्कर", unlimited: "असीमित वर्कर",
    gpuIncluded: "GPU वर्कर हर Orchestra AI संस्करण में शामिल है।",
    buy: "Orchestra AI प्राप्त करें", guide: "यह कैसे काम करता है और इसका उपयोग कैसे करें", loading: "कीमतें लोड हो रही हैं…",
  },
  ar: {
    title: "Orchestra AI: وحدة تحكم واحدة لذكائك الاصطناعي ووحدة معالجة الرسوميات",
    lead: "يشغّل Orchestra AI عمال الذكاء الاصطناعي على جهازك أو خادمك. احتفظ بمفاتيح المزودين في خزنة مشفّرة، وأضف عمال CPU للنماذج السحابية وعمال GPU للنماذج على بطاقة الرسوميات لديك، وتابع الحمل والطابور والتكلفة مباشرة.",
    gpuTitle: "عامل GPU: بطاقة الرسوميات لديك تشغّل الذكاء الاصطناعي بخصوصية",
    gpuLead: "يشغّل عامل GPU نماذج مفتوحة (Llama وQwen وMistral وغيرها، عبر Ollama) على بطاقة الرسوميات التي تملكها. تبقى الطلبات على جهازك، دون رسوم لكل رمز.",
    perk1: "يكتشف كل علامات GPU؛ تعمل NVIDIA (ويندوز ولينكس) وAMD (لينكس) داخل عامل GPU، وبقية البطاقات عبر Ollama.",
    perk2: "يشغّل Auto-Scale عمال GPU حقيقيين ويوقفهم — واحد لكل بطاقة، على أكثر وحدة GPU فراغًا، حتى من الصفر — ضمن ترخيصك.",
    perk3: "تُوقف بطاقات GPU الساخنة وتنتقل المهام إلى الأبرد.",
    perk4: "تبقى المفاتيح في الخزنة المشفّرة، وتبقى الإجابات على جهازك.",
    priceTitle: "السعر", perMonth: "شهرياً", perYear: "سنوياً",
    workers: "حتى {n} عامل", unlimited: "عمال غير محدودين",
    gpuIncluded: "عامل GPU مشمول في كل إصدار من Orchestra AI.",
    buy: "احصل على Orchestra AI", guide: "كيف يعمل وكيفية استخدامه", loading: "جارٍ تحميل الأسعار…",
  },
};

export function orchSpot(lang: Lang): OrchestraSpot {
  return ORCH_SPOT[lang] ?? ORCH_SPOT.en;
}

// ── The usage guide (English and Indonesian; other languages use English) ──

export interface GuideStep { title: string; text: string; shot?: string; shotAlt?: string }
export interface OrchestraGuideCopy {
  whatTitle: string; what: string[];
  flowTitle: string; flow: { you: string; core: string; cloud: string; gpu: string; note: string };
  gpuTitle: string; gpu: string[]; gpuCheckTitle: string; gpuCheck: string;
  stepsTitle: string; steps: GuideStep[];
  videoTitle: string; videoLead: string;
  editionsNote: string;
}

const GUIDE_EN: OrchestraGuideCopy = {
  whatTitle: "What Orchestra AI is",
  what: [
    "Orchestra AI is the control room for your AI. It runs on your own computer or server and keeps every provider key, worker and request in one place.",
    "You add workers: CPU workers call cloud models with the keys you store in the vault, and GPU workers run models on your graphics card. Orchestra sends each job to a worker, retries when a worker fails, and keeps the queue, the logs and the cost visible on one screen.",
    "Nothing is hidden: you see which worker answered, how long it took, what it cost, and which provider was used.",
  ],
  flowTitle: "How a request flows",
  flow: { you: "You, or your application", core: "Orchestra AI (your server)", cloud: "Cloud providers, with your keys", gpu: "GPU worker (your graphics card)", note: "Animation: a request travels from you to Orchestra, then to the worker it chooses." },
  gpuTitle: "What the GPU worker is",
  gpu: [
    "A GPU worker is an Orchestra worker that runs open AI models on the graphics card in your computer. It uses Ollama, so models such as Llama, Qwen and Mistral run on your hardware: prompts and answers never leave it, and there is no fee per token.",
    "Every GPU brand is found automatically on Windows, Linux and macOS, and AXTO Setup tests the card inside the worker before it starts. NVIDIA cards run in the GPU worker on Windows and Linux, AMD cards on Linux; other cards (and AMD or Intel on Windows) run through Ollama on your computer. The GPU Pool shows each card's model, utilisation, temperature, memory in use and power — and says plainly when a card cannot be used, and why.",
    "The GPU worker is included in every Orchestra AI edition. The edition sets how many workers you can run; GPU workers count inside that limit.",
  ],
  gpuCheckTitle: "Check that a model runs on the GPU",
  gpuCheck: "Run a model once (for example `ollama run llama3.2`), then run `ollama ps`. The PROCESSOR column must say 100% GPU. Orchestra's GPU Pool shows the same card with its utilisation, memory in use and temperature.",
  stepsTitle: "Use it in nine steps",
  steps: [
    { title: "Install and activate", text: "Install Orchestra AI with AXTO Setup (Windows or Linux) and enter your licence key. The licence is checked online; if the check cannot be reached, Orchestra keeps working for a short grace period." },
    { title: "Sign in to the console", text: "Open http://localhost:8088/console and sign in with the console password you set in orchestra.yml (console_password). Keep it private: it controls every worker and key.", shot: "01-sign-in.png", shotAlt: "Orchestra console sign-in" },
    { title: "Dashboard", text: "The dashboard shows the state at a glance: workers, queue, load, cost and the licence limits.", shot: "02-dashboard.png", shotAlt: "Orchestra console dashboard" },
    { title: "Store your provider keys", text: "In Credential Vault, add the key of each provider you use (OpenAI, Anthropic, Groq, Gemini, Mistral and more). Keys are stored encrypted in the vault.", shot: "03-vault.png", shotAlt: "Credential Vault with provider keys" },
    { title: "Add CPU workers for cloud models", text: "In Workers, register a worker per provider and model: choose the node, the provider, the model and the concurrency. The routing mode chooses which worker takes each job.", shot: "04-workers.png", shotAlt: "Workers page with CPU and GPU workers" },
    { title: "Add GPU workers from your graphics card", text: "In GPU Pool, each worker shows its card, utilisation, memory in use, temperature and power. AXTO Setup adds the GPU worker by itself when your card is ready (NVIDIA on Windows and Linux, AMD on Linux) and tests it first. On Auto-Scale, + GPU worker starts another one on the card with the most room. Swap replaces a GPU worker: remove it, then add the replacement, so the total stays within your limit.", shot: "05-gpu-pool.png", shotAlt: "GPU Pool with the detected card" },
    { title: "Let Auto-Scale work within your limit", text: "On Professional and Enterprise, Auto-Scale starts a real GPU worker — one per card, on the card with the most free memory — when the load is high, even from zero when GPU jobs are waiting, and stops the idle ones it started, always within the GPU limit of your edition. Set the thresholds, the minimum, the maximum and the cooldown; the thermal rules pause a hot card and move jobs to a cooler one.", shot: "06-auto-scale.png", shotAlt: "Auto-Scale rules and thermal settings" },
    { title: "Send a test and watch the cost", text: "Local Chat sends your message to the provider you choose, with its key from the vault, and shows the answer, the tokens and the cost. The Cost Tracker shows spend per provider. Routing Rules shows the active mode: smart balance, cost-first, quality-first, local-first, failover, semantic or round-robin.", shot: "07-local-chat.png", shotAlt: "Local Chat with an answer and cost" },
    { title: "Connect your apps", text: "In Client API, create a key for each app and set its requests per minute, tokens per minute, monthly budget and allowed models. The app then calls http://your-server:8088/v1/chat/completions like OpenAI (any OpenAI SDK, with its base URL changed); Orchestra routes each request to a worker and the provider keys never leave the vault. Text messages are supported; images in messages and tool calling are not.", shot: "11-client-api.png", shotAlt: "Client API page with app keys and limits" },
  ],
  videoTitle: "Watch the walkthrough",
  videoLead: "A recording of the console from sign-in to the cost tracker, on demo data.",
  editionsNote: "Prices are the current list prices for each edition, shown above.",
};

const GUIDE_ID: OrchestraGuideCopy = {
  whatTitle: "Apa itu Orchestra AI",
  what: [
    "Orchestra AI adalah ruang kendali AI Anda. Ia berjalan di komputer atau server Anda sendiri dan menyimpan semua kunci penyedia, worker dan permintaan di satu tempat.",
    "Anda menambahkan worker: worker CPU memanggil model cloud dengan kunci yang Anda simpan di vault, dan worker GPU menjalankan model di kartu grafis Anda. Orchestra mengirim setiap pekerjaan ke worker, mengulang bila worker gagal, dan menampilkan antrean, log dan biaya di satu layar.",
    "Tidak ada yang tersembunyi: Anda melihat worker mana yang menjawab, berapa lama, berapa biayanya, dan penyedia mana yang dipakai.",
  ],
  flowTitle: "Alur sebuah permintaan",
  flow: { you: "Anda, atau aplikasi Anda", core: "Orchestra AI (server Anda)", cloud: "Penyedia cloud, dengan kunci Anda", gpu: "Worker GPU (kartu grafis Anda)", note: "Animasi: permintaan berjalan dari Anda ke Orchestra, lalu ke worker yang dipilihnya." },
  gpuTitle: "Apa itu worker GPU",
  gpu: [
    "Worker GPU adalah worker Orchestra yang menjalankan model AI terbuka di kartu grafis komputer Anda. Ia memakai Ollama, sehingga model seperti Llama, Qwen dan Mistral berjalan di perangkat Anda: prompt dan jawaban tidak pernah keluar darinya, dan tidak ada biaya per token.",
    "Setiap merek GPU dikenali otomatis di Windows, Linux dan macOS, dan AXTO Setup menguji kartunya di dalam worker sebelum dinyalakan. Kartu NVIDIA berjalan di worker GPU di Windows dan Linux, kartu AMD di Linux; kartu lain (serta AMD atau Intel di Windows) berjalan lewat Ollama di komputer Anda. GPU Pool menampilkan model, utilisasi, suhu, memori terpakai dan daya setiap kartu — dan menyebut dengan jelas bila sebuah kartu tidak bisa dipakai, beserta alasannya.",
    "Worker GPU termasuk di setiap edisi Orchestra AI. Edisi menentukan berapa worker yang bisa Anda jalankan; worker GPU dihitung dalam batas itu.",
  ],
  gpuCheckTitle: "Pastikan model berjalan di GPU",
  gpuCheck: "Jalankan satu model (misalnya `ollama run llama3.2`), lalu jalankan `ollama ps`. Kolom PROCESSOR harus menulis 100% GPU. GPU Pool di Orchestra menampilkan kartu yang sama dengan utilisasi, memori terpakai dan suhunya.",
  stepsTitle: "Pakai dalam sembilan langkah",
  steps: [
    { title: "Pasang dan aktifkan", text: "Pasang Orchestra AI dengan AXTO Setup (Windows atau Linux), lalu masukkan kunci lisensi Anda. Lisensi diperiksa online; bila pemeriksaan tidak terjangkau, Orchestra tetap berjalan selama masa tenggang singkat." },
    { title: "Masuk ke konsol", text: "Buka http://localhost:8088/console dan masuk dengan kata sandi konsol yang Anda atur di orchestra.yml (console_password). Jaga kerahasiaannya: kata sandi ini mengendalikan semua worker dan kunci.", shot: "01-sign-in.png", shotAlt: "Masuk ke konsol Orchestra" },
    { title: "Dasbor", text: "Dasbor menampilkan kondisi sekilas: worker, antrean, beban, biaya dan batas lisensi.", shot: "02-dashboard.png", shotAlt: "Dasbor konsol Orchestra" },
    { title: "Simpan kunci penyedia", text: "Di Credential Vault, tambahkan kunci setiap penyedia yang Anda pakai (OpenAI, Anthropic, Groq, Gemini, Mistral dan lainnya). Kunci disimpan terenkripsi di vault.", shot: "03-vault.png", shotAlt: "Credential Vault dengan kunci penyedia" },
    { title: "Tambah worker CPU untuk model cloud", text: "Di Workers, daftarkan satu worker per penyedia dan model: pilih node, penyedia, model dan konkurensinya. Mode routing memilih worker mana yang mengerjakan setiap pekerjaan.", shot: "04-workers.png", shotAlt: "Halaman Workers dengan worker CPU dan GPU" },
    { title: "Tambah worker GPU dari kartu grafis Anda", text: "Di GPU Pool, setiap worker menampilkan kartu, utilisasi, memori terpakai, suhu dan dayanya. AXTO Setup menambahkan worker GPU sendiri bila kartu Anda siap (NVIDIA di Windows dan Linux, AMD di Linux) dan mengujinya dulu. Di Auto-Scale, + GPU worker menyalakan satu lagi di kartu yang paling longgar. Swap mengganti worker GPU: hapus, lalu tambahkan penggantinya, sehingga total tetap dalam batas Anda.", shot: "05-gpu-pool.png", shotAlt: "GPU Pool dengan kartu yang terdeteksi" },
    { title: "Biarkan Auto-Scale bekerja dalam batas Anda", text: "Di Professional dan Enterprise, Auto-Scale menyalakan worker GPU sungguhan — satu per kartu, di kartu dengan memori bebas terbanyak — saat beban tinggi, bahkan dari nol saat ada pekerjaan GPU yang menunggu, dan menghentikan worker menganggur yang dinyalakannya, selalu dalam batas GPU edisi Anda. Atur ambang, minimum, maksimum dan jeda; aturan suhu menjeda kartu yang panas dan memindahkan pekerjaan ke kartu yang lebih dingin.", shot: "06-auto-scale.png", shotAlt: "Aturan Auto-Scale dan pengaturan suhu" },
    { title: "Kirim uji coba dan pantau biaya", text: "Local Chat mengirim pesan Anda ke penyedia yang Anda pilih, memakai kuncinya dari vault, lalu menampilkan jawaban, token dan biayanya. Cost Tracker menampilkan belanja per penyedia. Routing Rules menampilkan mode yang aktif: smart balance, cost-first, quality-first, local-first, failover, semantic atau round-robin.", shot: "07-local-chat.png", shotAlt: "Local Chat dengan jawaban dan biaya" },
    { title: "Hubungkan aplikasi Anda", text: "Di Client API, buat satu kunci untuk setiap aplikasi dan atur permintaan per menit, token per menit, anggaran bulanan dan model yang boleh dipakai. Aplikasi lalu memanggil http://server-anda:8088/v1/chat/completions seperti OpenAI (SDK OpenAI apa pun, cukup ganti base URL-nya); Orchestra meneruskan setiap permintaan ke worker dan kunci penyedia tidak pernah keluar dari vault. Pesan teks didukung; gambar di dalam pesan dan tool calling belum.", shot: "11-client-api.png", shotAlt: "Halaman Client API dengan kunci aplikasi dan batasnya" },
  ],
  videoTitle: "Tonton panduan video",
  videoLead: "Rekaman konsol dari masuk hingga Cost Tracker, dengan data contoh.",
  editionsNote: "Harga adalah harga daftar terkini untuk setiap edisi, ditampilkan di atas.",
};

export function orchGuide(lang: Lang): OrchestraGuideCopy {
  return lang === "id" ? GUIDE_ID : GUIDE_EN;
}
