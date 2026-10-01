/* AXTO — Local Mode (AI on this device): settings, model picker and errors in 10 languages. */
import type { Lang } from "../i18n-shared";

const en = {
  title: "Local Mode — AI on this device",
  sub: "Run every AXTO app on a model installed on this computer. Your prompts, documents and the AI's answers go straight from this browser to that model — the AI request never passes through AXTO's servers.",
  on: "On · {model}",
  offBadge: "Not set up",
  kind: "Model server",
  kinds: { ollama: "Ollama", lmstudio: "LM Studio", custom: "Other OpenAI-compatible server (llama.cpp, Jan, LocalAI, vLLM…)" },
  baseUrl: "Server address",
  detect: "Find models",
  detecting: "Looking…",
  model: "Model",
  modelPh: "e.g. llama3.2",
  found: "{n} models found",
  noModels: "The server answered but has no models yet. Download one first, e.g. ollama pull llama3.2",
  preferred: "Use Local Mode by default in every app",
  save: "Save",
  saved: "Local Mode is on in this browser.",
  test: "Test",
  testing: "Asking the model…",
  testOk: "The model answered in {ms} ms: “{text}”",
  turnOff: "Turn off",
  off: "Local Mode is off in this browser.",
  unavailable: "Local Mode is switched off by the operator at the moment.",
  needPlan: "Local Mode is included from the Starter plan.",
  deviceOnly: "On this device",
  network: "On your local network",
  privacyTitle: "What stays on this device",
  privacy: [
    "The AI request — your messages, documents, transcripts and field values — goes from this browser only to the address above, and the answer comes straight back.",
    "For Legal AI, AXTO's server assembles the expert workspace instructions around placeholders; it never receives your text, documents or field values.",
    "For catalogue prompts, the browser downloads the template you chose (your plan unlocks it) and fills in your values here.",
    "AXTO does not relay, log or count Local Mode requests. What you choose to keep — chats, matters, cases — is saved encrypted in your account as usual. These settings stay in this browser.",
  ],
  setupTitle: "Set it up",
  setup: {
    ollama: [
      "Install Ollama from ollama.com and download a model, e.g. ollama pull llama3.2",
      "Allow this site to call it: set the environment variable OLLAMA_ORIGINS={origin} (Windows: Settings → System → Environment variables; macOS: launchctl setenv OLLAMA_ORIGINS \"{origin}\"; Linux: Environment=\"OLLAMA_ORIGINS={origin}\" in the ollama service), then restart Ollama.",
      "Press “Find models”, choose one and save.",
    ],
    lmstudio: [
      "Install LM Studio from lmstudio.ai and download a model.",
      "Open the Developer tab, start the local server and switch on “Enable CORS”.",
      "Press “Find models”, choose one and save.",
    ],
    custom: [
      "Start a server with an OpenAI-compatible API (/v1/chat/completions) on this computer or your local network.",
      "Allow requests from {origin} (CORS).",
      "Enter its address, press “Find models”, choose one and save.",
    ],
  },
  notesTitle: "Good to know",
  notes: [
    "Your browser may ask whether {origin} may connect to apps on this device — allow it.",
    "If your browser blocks the connection, use Chrome, Edge or Firefox.",
    "Live web research is not available in Local Mode. Clipper's audio transcription still uses your transcription key.",
    "Answer quality depends on the model you run: larger models answer better but need more memory.",
  ],
  errors: {
    url: "Enter the full address, e.g. http://localhost:11434",
    public: "Local Mode connects only to this computer or your local network (localhost, 127.0.0.1, 192.168.x.x…). For a server on the internet, add it under “My AI keys” as a custom endpoint.",
    unreachable: "{name} did not answer at {url}. Check that it is running and allows requests from {origin}.",
    http: "The local server answered with an error: {msg}",
    model: "The model “{model}” is not installed on the local server. Choose another one or download it.",
    empty: "The local model returned no text.",
    notSetUp: "Local Mode is not set up in this browser yet. Open Settings → My AI keys → Local Mode.",
  },
  picker: "This device (Local Mode)",
  pickerHint: "{name} on this device — the request does not go through AXTO",
  researchOff: "Live research is not available in Local Mode",
};

export type LocalAiDict = typeof en;

export const LOCALAI: Record<Lang, LocalAiDict> = {
  en,
  id: {
    "title": "Mode Lokal — AI di perangkat ini",
    "sub": "Jalankan semua aplikasi AXTO dengan model yang terpasang di komputer ini. Prompt, dokumen, dan jawaban AI langsung dari browser ini ke model tersebut — permintaan AI tidak pernah melewati server AXTO.",
    "on": "Aktif · {model}",
    "offBadge": "Belum diatur",
    "kind": "Server model",
    "kinds": {
      "ollama": "Ollama",
      "lmstudio": "LM Studio",
      "custom": "Server lain yang kompatibel OpenAI (llama.cpp, Jan, LocalAI, vLLM…)"
    },
    "baseUrl": "Alamat server",
    "detect": "Cari model",
    "detecting": "Mencari…",
    "model": "Model",
    "modelPh": "mis. llama3.2",
    "found": "{n} model ditemukan",
    "noModels": "Server menjawab tetapi belum ada model. Unduh dulu, mis. ollama pull llama3.2",
    "preferred": "Pakai Mode Lokal sebagai bawaan di semua aplikasi",
    "save": "Simpan",
    "saved": "Mode Lokal aktif di browser ini.",
    "test": "Uji",
    "testing": "Bertanya ke model…",
    "testOk": "Model menjawab dalam {ms} ms: “{text}”",
    "turnOff": "Matikan",
    "off": "Mode Lokal nonaktif di browser ini.",
    "unavailable": "Mode Lokal sedang dimatikan oleh operator.",
    "needPlan": "Mode Lokal tersedia mulai paket Starter.",
    "deviceOnly": "Di perangkat ini",
    "network": "Di jaringan lokal Anda",
    "privacyTitle": "Yang tetap di perangkat ini",
    "privacy": [
      "Permintaan AI — pesan, dokumen, transkrip, dan isian kolom Anda — hanya dikirim browser ini ke alamat di atas, dan jawabannya langsung kembali.",
      "Untuk Legal AI, server AXTO menyusun instruksi ahli workspace di sekitar placeholder; server tidak pernah menerima teks, dokumen, atau isian kolom Anda.",
      "Untuk prompt katalog, browser mengunduh template yang Anda pilih (dibuka oleh paket Anda) lalu mengisi nilai Anda di sini.",
      "AXTO tidak meneruskan, mencatat, atau menghitung permintaan Mode Lokal. Yang Anda pilih untuk disimpan — obrolan, perkara, kasus — tetap tersimpan terenkripsi di akun Anda seperti biasa. Pengaturan ini tetap di browser ini."
    ],
    "setupTitle": "Cara mengatur",
    "setup": {
      "ollama": [
        "Pasang Ollama dari ollama.com dan unduh model, mis. ollama pull llama3.2",
        "Izinkan situs ini memanggilnya: atur variabel lingkungan OLLAMA_ORIGINS={origin} (Windows: Pengaturan → Sistem → Variabel lingkungan; macOS: launchctl setenv OLLAMA_ORIGINS \"{origin}\"; Linux: Environment=\"OLLAMA_ORIGINS={origin}\" di layanan ollama), lalu mulai ulang Ollama.",
        "Tekan “Cari model”, pilih satu, lalu simpan."
      ],
      "lmstudio": [
        "Pasang LM Studio dari lmstudio.ai dan unduh model.",
        "Buka tab Developer, jalankan server lokal, dan aktifkan “Enable CORS”.",
        "Tekan “Cari model”, pilih satu, lalu simpan."
      ],
      "custom": [
        "Jalankan server dengan API kompatibel OpenAI (/v1/chat/completions) di komputer ini atau jaringan lokal Anda.",
        "Izinkan permintaan dari {origin} (CORS).",
        "Masukkan alamatnya, tekan “Cari model”, pilih satu, lalu simpan."
      ]
    },
    "notesTitle": "Perlu diketahui",
    "notes": [
      "Browser Anda mungkin bertanya apakah {origin} boleh terhubung ke aplikasi di perangkat ini — izinkan.",
      "Jika browser Anda memblokir koneksi, gunakan Chrome, Edge, atau Firefox.",
      "Riset web langsung tidak tersedia di Mode Lokal. Transkripsi audio di Clipper tetap memakai kunci transkripsi Anda.",
      "Kualitas jawaban bergantung pada model yang Anda jalankan: model yang lebih besar menjawab lebih baik tetapi butuh memori lebih banyak."
    ],
    "errors": {
      "url": "Masukkan alamat lengkap, mis. http://localhost:11434",
      "public": "Mode Lokal hanya terhubung ke komputer ini atau jaringan lokal Anda (localhost, 127.0.0.1, 192.168.x.x…). Untuk server di internet, tambahkan di “Kunci AI saya” sebagai endpoint kustom.",
      "unreachable": "{name} tidak menjawab di {url}. Pastikan sedang berjalan dan mengizinkan permintaan dari {origin}.",
      "http": "Server lokal menjawab dengan kesalahan: {msg}",
      "model": "Model “{model}” tidak terpasang di server lokal. Pilih model lain atau unduh dulu.",
      "empty": "Model lokal tidak mengembalikan teks.",
      "notSetUp": "Mode Lokal belum diatur di browser ini. Buka Pengaturan → Kunci AI saya → Mode Lokal."
    },
    "picker": "Perangkat ini (Mode Lokal)",
    "pickerHint": "{name} di perangkat ini — permintaan tidak melewati AXTO",
    "researchOff": "Riset langsung tidak tersedia di Mode Lokal"
  },
  ms: {
    "title": "Mod Tempatan — AI pada peranti ini",
    "sub": "Jalankan setiap aplikasi AXTO dengan model yang dipasang pada komputer ini. Prompt, dokumen dan jawapan AI terus dari pelayar ini ke model tersebut — permintaan AI tidak pernah melalui pelayan AXTO.",
    "on": "Aktif · {model}",
    "offBadge": "Belum disediakan",
    "kind": "Pelayan model",
    "kinds": {
      "ollama": "Ollama",
      "lmstudio": "LM Studio",
      "custom": "Pelayan lain yang serasi OpenAI (llama.cpp, Jan, LocalAI, vLLM…)"
    },
    "baseUrl": "Alamat pelayan",
    "detect": "Cari model",
    "detecting": "Mencari…",
    "model": "Model",
    "modelPh": "cth. llama3.2",
    "found": "{n} model ditemui",
    "noModels": "Pelayan menjawab tetapi belum ada model. Muat turun satu dahulu, cth. ollama pull llama3.2",
    "preferred": "Guna Mod Tempatan sebagai lalai dalam setiap aplikasi",
    "save": "Simpan",
    "saved": "Mod Tempatan aktif dalam pelayar ini.",
    "test": "Uji",
    "testing": "Bertanya kepada model…",
    "testOk": "Model menjawab dalam {ms} ms: “{text}”",
    "turnOff": "Matikan",
    "off": "Mod Tempatan tidak aktif dalam pelayar ini.",
    "unavailable": "Mod Tempatan sedang dimatikan oleh pengendali.",
    "needPlan": "Mod Tempatan disertakan bermula pelan Starter.",
    "deviceOnly": "Pada peranti ini",
    "network": "Pada rangkaian tempatan anda",
    "privacyTitle": "Apa yang kekal pada peranti ini",
    "privacy": [
      "Permintaan AI — mesej, dokumen, transkrip dan nilai medan anda — dihantar pelayar ini hanya ke alamat di atas, dan jawapannya terus kembali.",
      "Untuk Legal AI, pelayan AXTO menyusun arahan pakar ruang kerja di sekeliling pemegang tempat; ia tidak pernah menerima teks, dokumen atau nilai medan anda.",
      "Untuk prompt katalog, pelayar memuat turun templat yang anda pilih (dibuka oleh pelan anda) dan mengisi nilai anda di sini.",
      "AXTO tidak menghantar semula, merekod atau mengira permintaan Mod Tempatan. Apa yang anda pilih untuk simpan — sembang, perkara, kes — disimpan tersulit dalam akaun anda seperti biasa. Tetapan ini kekal dalam pelayar ini."
    ],
    "setupTitle": "Cara menyediakan",
    "setup": {
      "ollama": [
        "Pasang Ollama dari ollama.com dan muat turun model, cth. ollama pull llama3.2",
        "Benarkan laman ini memanggilnya: tetapkan pemboleh ubah persekitaran OLLAMA_ORIGINS={origin} (Windows: Tetapan → Sistem → Pemboleh ubah persekitaran; macOS: launchctl setenv OLLAMA_ORIGINS \"{origin}\"; Linux: Environment=\"OLLAMA_ORIGINS={origin}\" dalam perkhidmatan ollama), kemudian mulakan semula Ollama.",
        "Tekan “Cari model”, pilih satu dan simpan."
      ],
      "lmstudio": [
        "Pasang LM Studio dari lmstudio.ai dan muat turun model.",
        "Buka tab Developer, mulakan pelayan tempatan dan hidupkan “Enable CORS”.",
        "Tekan “Cari model”, pilih satu dan simpan."
      ],
      "custom": [
        "Mulakan pelayan dengan API serasi OpenAI (/v1/chat/completions) pada komputer ini atau rangkaian tempatan anda.",
        "Benarkan permintaan daripada {origin} (CORS).",
        "Masukkan alamatnya, tekan “Cari model”, pilih satu dan simpan."
      ]
    },
    "notesTitle": "Perlu diketahui",
    "notes": [
      "Pelayar anda mungkin bertanya sama ada {origin} boleh bersambung ke aplikasi pada peranti ini — benarkan.",
      "Jika pelayar anda menyekat sambungan, gunakan Chrome, Edge atau Firefox.",
      "Penyelidikan web langsung tidak tersedia dalam Mod Tempatan. Transkripsi audio Clipper masih menggunakan kunci transkripsi anda.",
      "Kualiti jawapan bergantung pada model yang anda jalankan: model lebih besar menjawab lebih baik tetapi memerlukan lebih banyak memori."
    ],
    "errors": {
      "url": "Masukkan alamat penuh, cth. http://localhost:11434",
      "public": "Mod Tempatan hanya bersambung ke komputer ini atau rangkaian tempatan anda (localhost, 127.0.0.1, 192.168.x.x…). Untuk pelayan di internet, tambahkannya di “Kunci AI saya” sebagai titik akhir tersuai.",
      "unreachable": "{name} tidak menjawab di {url}. Pastikan ia sedang berjalan dan membenarkan permintaan daripada {origin}.",
      "http": "Pelayan tempatan menjawab dengan ralat: {msg}",
      "model": "Model “{model}” tidak dipasang pada pelayan tempatan. Pilih yang lain atau muat turunnya.",
      "empty": "Model tempatan tidak memulangkan teks.",
      "notSetUp": "Mod Tempatan belum disediakan dalam pelayar ini. Buka Tetapan → Kunci AI saya → Mod Tempatan."
    },
    "picker": "Peranti ini (Mod Tempatan)",
    "pickerHint": "{name} pada peranti ini — permintaan tidak melalui AXTO",
    "researchOff": "Penyelidikan langsung tidak tersedia dalam Mod Tempatan"
  },
  de: {
    "title": "Lokaler Modus — KI auf diesem Gerät",
    "sub": "Nutzen Sie jede AXTO-App mit einem Modell, das auf diesem Computer installiert ist. Ihre Prompts, Dokumente und die Antworten der KI gehen direkt von diesem Browser zu diesem Modell — die KI-Anfrage läuft nie über die Server von AXTO.",
    "on": "Aktiv · {model}",
    "offBadge": "Nicht eingerichtet",
    "kind": "Modellserver",
    "kinds": {
      "ollama": "Ollama",
      "lmstudio": "LM Studio",
      "custom": "Anderer OpenAI-kompatibler Server (llama.cpp, Jan, LocalAI, vLLM…)"
    },
    "baseUrl": "Serveradresse",
    "detect": "Modelle suchen",
    "detecting": "Suche…",
    "model": "Modell",
    "modelPh": "z. B. llama3.2",
    "found": "{n} Modelle gefunden",
    "noModels": "Der Server antwortet, hat aber noch keine Modelle. Laden Sie zuerst eines, z. B. ollama pull llama3.2",
    "preferred": "Lokalen Modus in jeder App standardmäßig verwenden",
    "save": "Speichern",
    "saved": "Der lokale Modus ist in diesem Browser aktiv.",
    "test": "Testen",
    "testing": "Frage das Modell…",
    "testOk": "Das Modell antwortete in {ms} ms: „{text}“",
    "turnOff": "Ausschalten",
    "off": "Der lokale Modus ist in diesem Browser aus.",
    "unavailable": "Der lokale Modus ist derzeit vom Betreiber abgeschaltet.",
    "needPlan": "Der lokale Modus ist ab dem Starter-Tarif enthalten.",
    "deviceOnly": "Auf diesem Gerät",
    "network": "In Ihrem lokalen Netzwerk",
    "privacyTitle": "Was auf diesem Gerät bleibt",
    "privacy": [
      "Die KI-Anfrage — Ihre Nachrichten, Dokumente, Transkripte und Feldwerte — geht von diesem Browser nur an die Adresse oben, und die Antwort kommt direkt zurück.",
      "Für Legal AI setzt der AXTO-Server die Experten-Anweisungen des Arbeitsbereichs um Platzhalter herum zusammen; er erhält nie Ihren Text, Ihre Dokumente oder Feldwerte.",
      "Für Katalog-Prompts lädt der Browser die gewählte Vorlage herunter (Ihr Tarif schaltet sie frei) und setzt Ihre Werte hier ein.",
      "AXTO leitet Anfragen im lokalen Modus nicht weiter, protokolliert und zählt sie nicht. Was Sie behalten möchten — Chats, Mandate, Fälle — wird wie gewohnt verschlüsselt in Ihrem Konto gespeichert. Diese Einstellungen bleiben in diesem Browser."
    ],
    "setupTitle": "Einrichtung",
    "setup": {
      "ollama": [
        "Installieren Sie Ollama von ollama.com und laden Sie ein Modell, z. B. ollama pull llama3.2",
        "Erlauben Sie dieser Website den Zugriff: setzen Sie die Umgebungsvariable OLLAMA_ORIGINS={origin} (Windows: Einstellungen → System → Umgebungsvariablen; macOS: launchctl setenv OLLAMA_ORIGINS \"{origin}\"; Linux: Environment=\"OLLAMA_ORIGINS={origin}\" im ollama-Dienst) und starten Sie Ollama neu.",
        "Klicken Sie auf „Modelle suchen“, wählen Sie eines und speichern Sie."
      ],
      "lmstudio": [
        "Installieren Sie LM Studio von lmstudio.ai und laden Sie ein Modell.",
        "Öffnen Sie den Tab „Developer“, starten Sie den lokalen Server und aktivieren Sie „Enable CORS“.",
        "Klicken Sie auf „Modelle suchen“, wählen Sie eines und speichern Sie."
      ],
      "custom": [
        "Starten Sie einen Server mit OpenAI-kompatibler API (/v1/chat/completions) auf diesem Computer oder in Ihrem lokalen Netzwerk.",
        "Erlauben Sie Anfragen von {origin} (CORS).",
        "Geben Sie die Adresse ein, klicken Sie auf „Modelle suchen“, wählen Sie eines und speichern Sie."
      ]
    },
    "notesTitle": "Gut zu wissen",
    "notes": [
      "Ihr Browser fragt eventuell, ob {origin} sich mit Apps auf diesem Gerät verbinden darf — erlauben Sie es.",
      "Wenn Ihr Browser die Verbindung blockiert, verwenden Sie Chrome, Edge oder Firefox.",
      "Live-Webrecherche ist im lokalen Modus nicht verfügbar. Die Audio-Transkription in Clipper nutzt weiterhin Ihren Transkriptionsschlüssel.",
      "Die Qualität der Antworten hängt vom Modell ab: größere Modelle antworten besser, brauchen aber mehr Speicher."
    ],
    "errors": {
      "url": "Geben Sie die vollständige Adresse ein, z. B. http://localhost:11434",
      "public": "Der lokale Modus verbindet sich nur mit diesem Computer oder Ihrem lokalen Netzwerk (localhost, 127.0.0.1, 192.168.x.x…). Einen Server im Internet fügen Sie unter „Meine KI-Schlüssel“ als eigenen Endpunkt hinzu.",
      "unreachable": "{name} antwortet nicht unter {url}. Prüfen Sie, ob es läuft und Anfragen von {origin} erlaubt.",
      "http": "Der lokale Server meldet einen Fehler: {msg}",
      "model": "Das Modell „{model}“ ist auf dem lokalen Server nicht installiert. Wählen Sie ein anderes oder laden Sie es herunter.",
      "empty": "Das lokale Modell hat keinen Text geliefert.",
      "notSetUp": "Der lokale Modus ist in diesem Browser noch nicht eingerichtet. Öffnen Sie Einstellungen → Meine KI-Schlüssel → Lokaler Modus."
    },
    "picker": "Dieses Gerät (lokaler Modus)",
    "pickerHint": "{name} auf diesem Gerät — die Anfrage läuft nicht über AXTO",
    "researchOff": "Live-Recherche ist im lokalen Modus nicht verfügbar"
  },
  fr: {
    "title": "Mode local — l'IA sur cet appareil",
    "sub": "Utilisez chaque application AXTO avec un modèle installé sur cet ordinateur. Vos prompts, documents et les réponses de l'IA vont directement de ce navigateur à ce modèle — la requête d'IA ne passe jamais par les serveurs d'AXTO.",
    "on": "Actif · {model}",
    "offBadge": "Non configuré",
    "kind": "Serveur de modèles",
    "kinds": {
      "ollama": "Ollama",
      "lmstudio": "LM Studio",
      "custom": "Autre serveur compatible OpenAI (llama.cpp, Jan, LocalAI, vLLM…)"
    },
    "baseUrl": "Adresse du serveur",
    "detect": "Trouver les modèles",
    "detecting": "Recherche…",
    "model": "Modèle",
    "modelPh": "ex. llama3.2",
    "found": "{n} modèles trouvés",
    "noModels": "Le serveur répond mais n'a encore aucun modèle. Téléchargez-en un, ex. ollama pull llama3.2",
    "preferred": "Utiliser le mode local par défaut dans chaque application",
    "save": "Enregistrer",
    "saved": "Le mode local est activé dans ce navigateur.",
    "test": "Tester",
    "testing": "Question au modèle…",
    "testOk": "Le modèle a répondu en {ms} ms : « {text} »",
    "turnOff": "Désactiver",
    "off": "Le mode local est désactivé dans ce navigateur.",
    "unavailable": "Le mode local est actuellement désactivé par l'opérateur.",
    "needPlan": "Le mode local est inclus à partir de l'offre Starter.",
    "deviceOnly": "Sur cet appareil",
    "network": "Sur votre réseau local",
    "privacyTitle": "Ce qui reste sur cet appareil",
    "privacy": [
      "La requête d'IA — vos messages, documents, transcriptions et valeurs de champs — part de ce navigateur uniquement vers l'adresse ci-dessus, et la réponse revient directement.",
      "Pour Legal AI, le serveur d'AXTO assemble les instructions expertes de l'espace de travail autour d'espaces réservés ; il ne reçoit jamais votre texte, vos documents ni vos valeurs de champs.",
      "Pour les prompts du catalogue, le navigateur télécharge le modèle choisi (débloqué par votre offre) et y insère vos valeurs ici.",
      "AXTO ne relaie, n'enregistre ni ne compte les requêtes du mode local. Ce que vous choisissez de garder — conversations, dossiers, incidents — est enregistré chiffré dans votre compte, comme d'habitude. Ces réglages restent dans ce navigateur."
    ],
    "setupTitle": "Configuration",
    "setup": {
      "ollama": [
        "Installez Ollama depuis ollama.com et téléchargez un modèle, ex. ollama pull llama3.2",
        "Autorisez ce site à l'appeler : définissez la variable d'environnement OLLAMA_ORIGINS={origin} (Windows : Paramètres → Système → Variables d'environnement ; macOS : launchctl setenv OLLAMA_ORIGINS \"{origin}\" ; Linux : Environment=\"OLLAMA_ORIGINS={origin}\" dans le service ollama), puis redémarrez Ollama.",
        "Cliquez sur « Trouver les modèles », choisissez-en un et enregistrez."
      ],
      "lmstudio": [
        "Installez LM Studio depuis lmstudio.ai et téléchargez un modèle.",
        "Ouvrez l'onglet Developer, démarrez le serveur local et activez « Enable CORS ».",
        "Cliquez sur « Trouver les modèles », choisissez-en un et enregistrez."
      ],
      "custom": [
        "Démarrez un serveur avec une API compatible OpenAI (/v1/chat/completions) sur cet ordinateur ou votre réseau local.",
        "Autorisez les requêtes provenant de {origin} (CORS).",
        "Saisissez son adresse, cliquez sur « Trouver les modèles », choisissez-en un et enregistrez."
      ]
    },
    "notesTitle": "Bon à savoir",
    "notes": [
      "Votre navigateur peut demander si {origin} peut se connecter aux applications de cet appareil — autorisez-le.",
      "Si votre navigateur bloque la connexion, utilisez Chrome, Edge ou Firefox.",
      "La recherche web en direct n'est pas disponible en mode local. La transcription audio de Clipper utilise toujours votre clé de transcription.",
      "La qualité des réponses dépend du modèle utilisé : les plus grands répondent mieux mais demandent plus de mémoire."
    ],
    "errors": {
      "url": "Saisissez l'adresse complète, ex. http://localhost:11434",
      "public": "Le mode local se connecte uniquement à cet ordinateur ou à votre réseau local (localhost, 127.0.0.1, 192.168.x.x…). Pour un serveur sur Internet, ajoutez-le dans « Mes clés IA » comme point de terminaison personnalisé.",
      "unreachable": "{name} ne répond pas à {url}. Vérifiez qu'il tourne et qu'il autorise les requêtes de {origin}.",
      "http": "Le serveur local a répondu par une erreur : {msg}",
      "model": "Le modèle « {model} » n'est pas installé sur le serveur local. Choisissez-en un autre ou téléchargez-le.",
      "empty": "Le modèle local n'a renvoyé aucun texte.",
      "notSetUp": "Le mode local n'est pas encore configuré dans ce navigateur. Ouvrez Paramètres → Mes clés IA → Mode local."
    },
    "picker": "Cet appareil (mode local)",
    "pickerHint": "{name} sur cet appareil — la requête ne passe pas par AXTO",
    "researchOff": "La recherche en direct n'est pas disponible en mode local"
  },
  it: {
    "title": "Modalità locale — IA su questo dispositivo",
    "sub": "Usa ogni app AXTO con un modello installato su questo computer. Prompt, documenti e risposte dell'IA vanno direttamente da questo browser a quel modello — la richiesta di IA non passa mai dai server di AXTO.",
    "on": "Attiva · {model}",
    "offBadge": "Non configurata",
    "kind": "Server del modello",
    "kinds": {
      "ollama": "Ollama",
      "lmstudio": "LM Studio",
      "custom": "Altro server compatibile OpenAI (llama.cpp, Jan, LocalAI, vLLM…)"
    },
    "baseUrl": "Indirizzo del server",
    "detect": "Trova modelli",
    "detecting": "Ricerca…",
    "model": "Modello",
    "modelPh": "es. llama3.2",
    "found": "{n} modelli trovati",
    "noModels": "Il server risponde ma non ha ancora modelli. Scaricane uno, es. ollama pull llama3.2",
    "preferred": "Usa la modalità locale come predefinita in ogni app",
    "save": "Salva",
    "saved": "La modalità locale è attiva in questo browser.",
    "test": "Prova",
    "testing": "Chiedo al modello…",
    "testOk": "Il modello ha risposto in {ms} ms: «{text}»",
    "turnOff": "Disattiva",
    "off": "La modalità locale è disattivata in questo browser.",
    "unavailable": "La modalità locale è al momento disattivata dall'operatore.",
    "needPlan": "La modalità locale è inclusa dal piano Starter.",
    "deviceOnly": "Su questo dispositivo",
    "network": "Sulla tua rete locale",
    "privacyTitle": "Cosa resta su questo dispositivo",
    "privacy": [
      "La richiesta di IA — messaggi, documenti, trascrizioni e valori dei campi — parte da questo browser solo verso l'indirizzo sopra, e la risposta torna direttamente.",
      "Per Legal AI, il server di AXTO compone le istruzioni esperte dello spazio di lavoro attorno a segnaposto; non riceve mai testo, documenti o valori dei campi.",
      "Per i prompt del catalogo, il browser scarica il modello scelto (sbloccato dal tuo piano) e inserisce qui i tuoi valori.",
      "AXTO non inoltra, non registra e non conteggia le richieste in modalità locale. Ciò che scegli di conservare — chat, pratiche, casi — viene salvato cifrato nel tuo account come sempre. Queste impostazioni restano in questo browser."
    ],
    "setupTitle": "Configurazione",
    "setup": {
      "ollama": [
        "Installa Ollama da ollama.com e scarica un modello, es. ollama pull llama3.2",
        "Consenti a questo sito di chiamarlo: imposta la variabile d'ambiente OLLAMA_ORIGINS={origin} (Windows: Impostazioni → Sistema → Variabili d'ambiente; macOS: launchctl setenv OLLAMA_ORIGINS \"{origin}\"; Linux: Environment=\"OLLAMA_ORIGINS={origin}\" nel servizio ollama), poi riavvia Ollama.",
        "Premi «Trova modelli», scegline uno e salva."
      ],
      "lmstudio": [
        "Installa LM Studio da lmstudio.ai e scarica un modello.",
        "Apri la scheda Developer, avvia il server locale e attiva «Enable CORS».",
        "Premi «Trova modelli», scegline uno e salva."
      ],
      "custom": [
        "Avvia un server con API compatibile OpenAI (/v1/chat/completions) su questo computer o sulla rete locale.",
        "Consenti le richieste da {origin} (CORS).",
        "Inserisci l'indirizzo, premi «Trova modelli», scegline uno e salva."
      ]
    },
    "notesTitle": "Da sapere",
    "notes": [
      "Il browser potrebbe chiedere se {origin} può connettersi alle app di questo dispositivo — consenti.",
      "Se il browser blocca la connessione, usa Chrome, Edge o Firefox.",
      "La ricerca web in tempo reale non è disponibile in modalità locale. La trascrizione audio di Clipper usa ancora la tua chiave di trascrizione.",
      "La qualità delle risposte dipende dal modello: i modelli più grandi rispondono meglio ma richiedono più memoria."
    ],
    "errors": {
      "url": "Inserisci l'indirizzo completo, es. http://localhost:11434",
      "public": "La modalità locale si collega solo a questo computer o alla tua rete locale (localhost, 127.0.0.1, 192.168.x.x…). Per un server su Internet, aggiungilo in «Le mie chiavi IA» come endpoint personalizzato.",
      "unreachable": "{name} non risponde a {url}. Verifica che sia in esecuzione e che consenta richieste da {origin}.",
      "http": "Il server locale ha risposto con un errore: {msg}",
      "model": "Il modello «{model}» non è installato sul server locale. Scegline un altro o scaricalo.",
      "empty": "Il modello locale non ha restituito testo.",
      "notSetUp": "La modalità locale non è ancora configurata in questo browser. Apri Impostazioni → Le mie chiavi IA → Modalità locale."
    },
    "picker": "Questo dispositivo (modalità locale)",
    "pickerHint": "{name} su questo dispositivo — la richiesta non passa da AXTO",
    "researchOff": "La ricerca in tempo reale non è disponibile in modalità locale"
  },
  zh: {
    "title": "本地模式 —— 在本设备上运行 AI",
    "sub": "使用安装在这台电脑上的模型运行所有 AXTO 应用。您的提示词、文档和 AI 的回答直接从此浏览器发送到该模型 —— AI 请求从不经过 AXTO 的服务器。",
    "on": "已开启 · {model}",
    "offBadge": "未设置",
    "kind": "模型服务器",
    "kinds": {
      "ollama": "Ollama",
      "lmstudio": "LM Studio",
      "custom": "其他兼容 OpenAI 的服务器（llama.cpp、Jan、LocalAI、vLLM…）"
    },
    "baseUrl": "服务器地址",
    "detect": "查找模型",
    "detecting": "正在查找…",
    "model": "模型",
    "modelPh": "例如 llama3.2",
    "found": "找到 {n} 个模型",
    "noModels": "服务器已响应，但还没有模型。请先下载一个，例如 ollama pull llama3.2",
    "preferred": "在所有应用中默认使用本地模式",
    "save": "保存",
    "saved": "本地模式已在此浏览器中开启。",
    "test": "测试",
    "testing": "正在询问模型…",
    "testOk": "模型在 {ms} 毫秒内回答：“{text}”",
    "turnOff": "关闭",
    "off": "本地模式已在此浏览器中关闭。",
    "unavailable": "本地模式目前已被运营方关闭。",
    "needPlan": "本地模式从 Starter 套餐起提供。",
    "deviceOnly": "在本设备上",
    "network": "在您的局域网中",
    "privacyTitle": "哪些内容留在本设备上",
    "privacy": [
      "AI 请求（您的消息、文档、转录和字段值）只会从此浏览器发送到上面的地址，回答也直接返回。",
      "对于 Legal AI，AXTO 服务器会围绕占位符组装工作区的专家指令；它从不接收您的文本、文档或字段值。",
      "对于目录提示词，浏览器会下载您选择的模板（由您的套餐解锁），并在本地填入您的值。",
      "AXTO 不转发、不记录也不统计本地模式请求。您选择保留的内容（对话、案件、事件）照常加密保存在您的账户中。这些设置只保存在此浏览器中。"
    ],
    "setupTitle": "设置方法",
    "setup": {
      "ollama": [
        "从 ollama.com 安装 Ollama 并下载模型，例如 ollama pull llama3.2",
        "允许本网站调用它：设置环境变量 OLLAMA_ORIGINS={origin}（Windows：设置 → 系统 → 环境变量；macOS：launchctl setenv OLLAMA_ORIGINS \"{origin}\"；Linux：在 ollama 服务中加入 Environment=\"OLLAMA_ORIGINS={origin}\"），然后重启 Ollama。",
        "点击“查找模型”，选择一个并保存。"
      ],
      "lmstudio": [
        "从 lmstudio.ai 安装 LM Studio 并下载模型。",
        "打开 Developer 标签页，启动本地服务器并开启“Enable CORS”。",
        "点击“查找模型”，选择一个并保存。"
      ],
      "custom": [
        "在这台电脑或您的局域网上启动一个提供 OpenAI 兼容 API（/v1/chat/completions）的服务器。",
        "允许来自 {origin} 的请求（CORS）。",
        "输入其地址，点击“查找模型”，选择一个并保存。"
      ]
    },
    "notesTitle": "须知",
    "notes": [
      "浏览器可能会询问是否允许 {origin} 连接本设备上的应用 —— 请允许。",
      "如果浏览器阻止了连接，请使用 Chrome、Edge 或 Firefox。",
      "本地模式不提供实时网络检索。Clipper 的音频转录仍使用您的转录密钥。",
      "回答质量取决于所运行的模型：更大的模型回答更好，但需要更多内存。"
    ],
    "errors": {
      "url": "请输入完整地址，例如 http://localhost:11434",
      "public": "本地模式只连接这台电脑或您的局域网（localhost、127.0.0.1、192.168.x.x…）。如需使用互联网上的服务器，请在“我的 AI 密钥”中将其添加为自定义端点。",
      "unreachable": "{name} 在 {url} 没有响应。请确认它正在运行，并允许来自 {origin} 的请求。",
      "http": "本地服务器返回错误：{msg}",
      "model": "本地服务器上没有安装模型“{model}”。请选择其他模型或先下载。",
      "empty": "本地模型没有返回文本。",
      "notSetUp": "此浏览器尚未设置本地模式。请打开 设置 → 我的 AI 密钥 → 本地模式。"
    },
    "picker": "本设备（本地模式）",
    "pickerHint": "本设备上的 {name} —— 请求不经过 AXTO",
    "researchOff": "本地模式不提供实时检索"
  },
  ja: {
    "title": "ローカルモード — このデバイスで動く AI",
    "sub": "このコンピューターにインストールしたモデルで AXTO のすべてのアプリを使えます。プロンプト、ドキュメント、AI の回答はこのブラウザーからそのモデルへ直接送られ、AI リクエストが AXTO のサーバーを通ることはありません。",
    "on": "オン · {model}",
    "offBadge": "未設定",
    "kind": "モデルサーバー",
    "kinds": {
      "ollama": "Ollama",
      "lmstudio": "LM Studio",
      "custom": "その他の OpenAI 互換サーバー（llama.cpp、Jan、LocalAI、vLLM…）"
    },
    "baseUrl": "サーバーのアドレス",
    "detect": "モデルを検索",
    "detecting": "検索中…",
    "model": "モデル",
    "modelPh": "例：llama3.2",
    "found": "{n} 個のモデルが見つかりました",
    "noModels": "サーバーは応答しましたが、まだモデルがありません。先にダウンロードしてください（例：ollama pull llama3.2）",
    "preferred": "すべてのアプリでローカルモードを既定にする",
    "save": "保存",
    "saved": "このブラウザーでローカルモードがオンになりました。",
    "test": "テスト",
    "testing": "モデルに問い合わせ中…",
    "testOk": "モデルが {ms} ミリ秒で回答しました：「{text}」",
    "turnOff": "オフにする",
    "off": "このブラウザーではローカルモードはオフです。",
    "unavailable": "ローカルモードは現在、運営者によって停止されています。",
    "needPlan": "ローカルモードは Starter プランから利用できます。",
    "deviceOnly": "このデバイス上",
    "network": "ローカルネットワーク上",
    "privacyTitle": "このデバイスに残るもの",
    "privacy": [
      "AI リクエスト（メッセージ、ドキュメント、文字起こし、入力値）は、このブラウザーから上のアドレスにだけ送られ、回答はそのまま返ってきます。",
      "Legal AI では、AXTO のサーバーがプレースホルダーを使ってワークスペースの専門指示を組み立てます。あなたのテキスト、ドキュメント、入力値は受け取りません。",
      "カタログのプロンプトでは、選んだテンプレート（プランで解放）をブラウザーがダウンロードし、ここで値を埋め込みます。",
      "AXTO はローカルモードのリクエストを中継・記録・集計しません。保存すると選んだもの（チャット、案件、ケース）は、通常どおりアカウントに暗号化して保存されます。この設定はこのブラウザーにのみ保存されます。"
    ],
    "setupTitle": "設定方法",
    "setup": {
      "ollama": [
        "ollama.com から Ollama をインストールし、モデルをダウンロードします（例：ollama pull llama3.2）",
        "このサイトからの呼び出しを許可します：環境変数 OLLAMA_ORIGINS={origin} を設定（Windows：設定 → システム → 環境変数、macOS：launchctl setenv OLLAMA_ORIGINS \"{origin}\"、Linux：ollama サービスに Environment=\"OLLAMA_ORIGINS={origin}\"）し、Ollama を再起動します。",
        "「モデルを検索」を押し、1 つ選んで保存します。"
      ],
      "lmstudio": [
        "lmstudio.ai から LM Studio をインストールし、モデルをダウンロードします。",
        "Developer タブを開き、ローカルサーバーを起動して「Enable CORS」をオンにします。",
        "「モデルを検索」を押し、1 つ選んで保存します。"
      ],
      "custom": [
        "このコンピューターまたはローカルネットワーク上で、OpenAI 互換 API（/v1/chat/completions）を持つサーバーを起動します。",
        "{origin} からのリクエストを許可します（CORS）。",
        "アドレスを入力し、「モデルを検索」を押して 1 つ選び、保存します。"
      ]
    },
    "notesTitle": "知っておきたいこと",
    "notes": [
      "ブラウザーが {origin} にこのデバイスのアプリへの接続を許可するか尋ねる場合があります — 許可してください。",
      "ブラウザーが接続をブロックする場合は、Chrome、Edge、Firefox を使ってください。",
      "ローカルモードではリアルタイムのウェブ検索は使えません。Clipper の音声文字起こしは引き続き文字起こし用のキーを使います。",
      "回答の品質は実行するモデルによります。大きいモデルほど高品質ですが、より多くのメモリが必要です。"
    ],
    "errors": {
      "url": "完全なアドレスを入力してください（例：http://localhost:11434）",
      "public": "ローカルモードはこのコンピューターまたはローカルネットワーク（localhost、127.0.0.1、192.168.x.x…）にのみ接続します。インターネット上のサーバーは「マイ AI キー」でカスタムエンドポイントとして追加してください。",
      "unreachable": "{name} が {url} で応答しません。起動していて、{origin} からのリクエストを許可しているか確認してください。",
      "http": "ローカルサーバーがエラーを返しました：{msg}",
      "model": "モデル「{model}」はローカルサーバーにインストールされていません。別のモデルを選ぶか、ダウンロードしてください。",
      "empty": "ローカルモデルからテキストが返されませんでした。",
      "notSetUp": "このブラウザーではまだローカルモードが設定されていません。設定 → マイ AI キー → ローカルモード を開いてください。"
    },
    "picker": "このデバイス（ローカルモード）",
    "pickerHint": "このデバイスの {name} — リクエストは AXTO を経由しません",
    "researchOff": "ローカルモードではリアルタイム検索は使えません"
  },
  hi: {
    "title": "लोकल मोड — इसी डिवाइस पर AI",
    "sub": "इस कंप्यूटर पर इंस्टॉल किए गए मॉडल से AXTO के सभी ऐप चलाएँ। आपके प्रॉम्प्ट, दस्तावेज़ और AI के जवाब सीधे इस ब्राउज़र से उस मॉडल तक जाते हैं — AI अनुरोध कभी AXTO के सर्वर से होकर नहीं गुज़रता।",
    "on": "चालू · {model}",
    "offBadge": "सेट नहीं है",
    "kind": "मॉडल सर्वर",
    "kinds": {
      "ollama": "Ollama",
      "lmstudio": "LM Studio",
      "custom": "कोई और OpenAI-संगत सर्वर (llama.cpp, Jan, LocalAI, vLLM…)"
    },
    "baseUrl": "सर्वर का पता",
    "detect": "मॉडल खोजें",
    "detecting": "खोज रहे हैं…",
    "model": "मॉडल",
    "modelPh": "जैसे llama3.2",
    "found": "{n} मॉडल मिले",
    "noModels": "सर्वर ने जवाब दिया, लेकिन अभी कोई मॉडल नहीं है। पहले एक डाउनलोड करें, जैसे ollama pull llama3.2",
    "preferred": "हर ऐप में लोकल मोड को डिफ़ॉल्ट बनाएँ",
    "save": "सहेजें",
    "saved": "इस ब्राउज़र में लोकल मोड चालू है।",
    "test": "परीक्षण",
    "testing": "मॉडल से पूछ रहे हैं…",
    "testOk": "मॉडल ने {ms} ms में जवाब दिया: “{text}”",
    "turnOff": "बंद करें",
    "off": "इस ब्राउज़र में लोकल मोड बंद है।",
    "unavailable": "लोकल मोड को अभी ऑपरेटर ने बंद किया हुआ है।",
    "needPlan": "लोकल मोड Starter प्लान से शामिल है।",
    "deviceOnly": "इसी डिवाइस पर",
    "network": "आपके लोकल नेटवर्क पर",
    "privacyTitle": "इस डिवाइस पर क्या रहता है",
    "privacy": [
      "AI अनुरोध — आपके संदेश, दस्तावेज़, ट्रांसक्रिप्ट और फ़ील्ड के मान — यह ब्राउज़र केवल ऊपर दिए पते पर भेजता है, और जवाब सीधे वापस आता है।",
      "Legal AI के लिए AXTO का सर्वर प्लेसहोल्डर के आसपास वर्कस्पेस के विशेषज्ञ निर्देश तैयार करता है; उसे आपका टेक्स्ट, दस्तावेज़ या फ़ील्ड के मान कभी नहीं मिलते।",
      "कैटलॉग प्रॉम्प्ट के लिए ब्राउज़र आपका चुना हुआ टेम्पलेट डाउनलोड करता है (आपका प्लान इसे खोलता है) और आपके मान यहीं भरता है।",
      "AXTO लोकल मोड के अनुरोधों को न आगे भेजता है, न लॉग करता है, न गिनता है। जो आप रखना चुनते हैं — चैट, मामले, केस — वह हमेशा की तरह आपके खाते में एन्क्रिप्ट होकर सहेजा जाता है। ये सेटिंग्स इसी ब्राउज़र में रहती हैं।"
    ],
    "setupTitle": "सेट करने का तरीका",
    "setup": {
      "ollama": [
        "ollama.com से Ollama इंस्टॉल करें और एक मॉडल डाउनलोड करें, जैसे ollama pull llama3.2",
        "इस साइट को इसे कॉल करने दें: एनवायरनमेंट वेरिएबल OLLAMA_ORIGINS={origin} सेट करें (Windows: सेटिंग्स → सिस्टम → एनवायरनमेंट वेरिएबल; macOS: launchctl setenv OLLAMA_ORIGINS \"{origin}\"; Linux: ollama सर्विस में Environment=\"OLLAMA_ORIGINS={origin}\"), फिर Ollama को फिर से शुरू करें।",
        "“मॉडल खोजें” दबाएँ, एक चुनें और सहेजें।"
      ],
      "lmstudio": [
        "lmstudio.ai से LM Studio इंस्टॉल करें और एक मॉडल डाउनलोड करें।",
        "Developer टैब खोलें, लोकल सर्वर शुरू करें और “Enable CORS” चालू करें।",
        "“मॉडल खोजें” दबाएँ, एक चुनें और सहेजें।"
      ],
      "custom": [
        "इस कंप्यूटर या अपने लोकल नेटवर्क पर OpenAI-संगत API (/v1/chat/completions) वाला सर्वर शुरू करें।",
        "{origin} से आने वाले अनुरोधों की अनुमति दें (CORS)।",
        "उसका पता डालें, “मॉडल खोजें” दबाएँ, एक चुनें और सहेजें।"
      ]
    },
    "notesTitle": "जानने योग्य बातें",
    "notes": [
      "आपका ब्राउज़र पूछ सकता है कि क्या {origin} इस डिवाइस के ऐप्स से जुड़ सकता है — अनुमति दें।",
      "अगर आपका ब्राउज़र कनेक्शन रोकता है, तो Chrome, Edge या Firefox इस्तेमाल करें।",
      "लोकल मोड में लाइव वेब रिसर्च उपलब्ध नहीं है। Clipper का ऑडियो ट्रांसक्रिप्शन अब भी आपकी ट्रांसक्रिप्शन कुंजी का इस्तेमाल करता है।",
      "जवाब की गुणवत्ता आपके चलाए मॉडल पर निर्भर करती है: बड़े मॉडल बेहतर जवाब देते हैं, पर ज़्यादा मेमोरी लेते हैं।"
    ],
    "errors": {
      "url": "पूरा पता डालें, जैसे http://localhost:11434",
      "public": "लोकल मोड केवल इस कंप्यूटर या आपके लोकल नेटवर्क (localhost, 127.0.0.1, 192.168.x.x…) से जुड़ता है। इंटरनेट पर मौजूद सर्वर को “मेरी AI कुंजियाँ” में कस्टम एंडपॉइंट के रूप में जोड़ें।",
      "unreachable": "{name} ने {url} पर जवाब नहीं दिया। जाँचें कि यह चल रहा है और {origin} से अनुरोधों की अनुमति देता है।",
      "http": "लोकल सर्वर ने त्रुटि लौटाई: {msg}",
      "model": "मॉडल “{model}” लोकल सर्वर पर इंस्टॉल नहीं है। कोई और चुनें या इसे डाउनलोड करें।",
      "empty": "लोकल मॉडल ने कोई टेक्स्ट नहीं लौटाया।",
      "notSetUp": "इस ब्राउज़र में लोकल मोड अभी सेट नहीं है। सेटिंग्स → मेरी AI कुंजियाँ → लोकल मोड खोलें।"
    },
    "picker": "यह डिवाइस (लोकल मोड)",
    "pickerHint": "इस डिवाइस पर {name} — अनुरोध AXTO से होकर नहीं जाता",
    "researchOff": "लोकल मोड में लाइव रिसर्च उपलब्ध नहीं है"
  },
  ar: {
    "title": "الوضع المحلي — الذكاء الاصطناعي على هذا الجهاز",
    "sub": "شغّل كل تطبيقات AXTO بنموذج مثبّت على هذا الحاسوب. تنتقل موجّهاتك ومستنداتك وإجابات الذكاء الاصطناعي مباشرة من هذا المتصفح إلى ذلك النموذج — ولا يمر طلب الذكاء الاصطناعي أبدًا عبر خوادم AXTO.",
    "on": "مفعّل · {model}",
    "offBadge": "غير مُعدّ",
    "kind": "خادم النموذج",
    "kinds": {
      "ollama": "Ollama",
      "lmstudio": "LM Studio",
      "custom": "خادم آخر متوافق مع OpenAI (llama.cpp وJan وLocalAI وvLLM…)"
    },
    "baseUrl": "عنوان الخادم",
    "detect": "البحث عن النماذج",
    "detecting": "جارٍ البحث…",
    "model": "النموذج",
    "modelPh": "مثال: llama3.2",
    "found": "تم العثور على {n} نموذجًا",
    "noModels": "استجاب الخادم لكن لا توجد نماذج بعد. نزّل نموذجًا أولًا، مثل ollama pull llama3.2",
    "preferred": "استخدام الوضع المحلي افتراضيًا في كل التطبيقات",
    "save": "حفظ",
    "saved": "الوضع المحلي مفعّل في هذا المتصفح.",
    "test": "اختبار",
    "testing": "جارٍ سؤال النموذج…",
    "testOk": "أجاب النموذج خلال {ms} مللي ثانية: «{text}»",
    "turnOff": "إيقاف",
    "off": "الوضع المحلي متوقف في هذا المتصفح.",
    "unavailable": "أوقف المشغّل الوضع المحلي في الوقت الحالي.",
    "needPlan": "الوضع المحلي متاح بدءًا من خطة Starter.",
    "deviceOnly": "على هذا الجهاز",
    "network": "على شبكتك المحلية",
    "privacyTitle": "ما يبقى على هذا الجهاز",
    "privacy": [
      "يُرسل هذا المتصفح طلب الذكاء الاصطناعي — رسائلك ومستنداتك ونصوصك المفرّغة وقيم الحقول — إلى العنوان أعلاه فقط، وتعود الإجابة مباشرة.",
      "في Legal AI، يجمّع خادم AXTO تعليمات الخبراء الخاصة بمساحة العمل حول عناصر نائبة؛ ولا يتلقى أبدًا نصك أو مستنداتك أو قيم حقولك.",
      "في موجّهات الكتالوج، ينزّل المتصفح القالب الذي اخترته (تفتحه خطتك) ويملأ قيمك هنا.",
      "لا يمرّر AXTO طلبات الوضع المحلي ولا يسجّلها ولا يعدّها. ما تختار الاحتفاظ به — المحادثات والقضايا والحالات — يُحفظ مشفّرًا في حسابك كالمعتاد. تبقى هذه الإعدادات في هذا المتصفح."
    ],
    "setupTitle": "طريقة الإعداد",
    "setup": {
      "ollama": [
        "ثبّت Ollama من ollama.com ونزّل نموذجًا، مثل ollama pull llama3.2",
        "اسمح لهذا الموقع باستدعائه: اضبط متغير البيئة OLLAMA_ORIGINS={origin} (Windows: الإعدادات ← النظام ← متغيرات البيئة؛ macOS: launchctl setenv OLLAMA_ORIGINS \"{origin}\"؛ Linux: Environment=\"OLLAMA_ORIGINS={origin}\" في خدمة ollama)، ثم أعد تشغيل Ollama.",
        "اضغط «البحث عن النماذج» واختر واحدًا ثم احفظ."
      ],
      "lmstudio": [
        "ثبّت LM Studio من lmstudio.ai ونزّل نموذجًا.",
        "افتح علامة التبويب Developer وشغّل الخادم المحلي وفعّل «Enable CORS».",
        "اضغط «البحث عن النماذج» واختر واحدًا ثم احفظ."
      ],
      "custom": [
        "شغّل خادمًا بواجهة API متوافقة مع OpenAI ‏(/v1/chat/completions) على هذا الحاسوب أو على شبكتك المحلية.",
        "اسمح بالطلبات القادمة من {origin} ‏(CORS).",
        "أدخل عنوانه واضغط «البحث عن النماذج» واختر واحدًا ثم احفظ."
      ]
    },
    "notesTitle": "معلومات مفيدة",
    "notes": [
      "قد يسألك المتصفح هل يُسمح لـ {origin} بالاتصال بالتطبيقات على هذا الجهاز — اسمح بذلك.",
      "إذا حظر المتصفح الاتصال، فاستخدم Chrome أو Edge أو Firefox.",
      "البحث المباشر على الويب غير متاح في الوضع المحلي. ما زال تفريغ الصوت في Clipper يستخدم مفتاح التفريغ الخاص بك.",
      "تعتمد جودة الإجابات على النموذج الذي تشغّله: النماذج الأكبر تجيب أفضل لكنها تحتاج إلى ذاكرة أكبر."
    ],
    "errors": {
      "url": "أدخل العنوان الكامل، مثل http://localhost:11434",
      "public": "لا يتصل الوضع المحلي إلا بهذا الحاسوب أو بشبكتك المحلية (localhost و127.0.0.1 و192.168.x.x…). لاستخدام خادم على الإنترنت، أضفه في «مفاتيح الذكاء الاصطناعي الخاصة بي» كنقطة نهاية مخصّصة.",
      "unreachable": "لم يستجب {name} على {url}. تأكد من أنه يعمل ويسمح بالطلبات القادمة من {origin}.",
      "http": "أعاد الخادم المحلي خطأ: {msg}",
      "model": "النموذج «{model}» غير مثبّت على الخادم المحلي. اختر نموذجًا آخر أو نزّله.",
      "empty": "لم يُرجع النموذج المحلي أي نص.",
      "notSetUp": "لم يُعدّ الوضع المحلي في هذا المتصفح بعد. افتح الإعدادات ← مفاتيح الذكاء الاصطناعي الخاصة بي ← الوضع المحلي."
    },
    "picker": "هذا الجهاز (الوضع المحلي)",
    "pickerHint": "{name} على هذا الجهاز — لا يمر الطلب عبر AXTO",
    "researchOff": "البحث المباشر غير متاح في الوضع المحلي"
  },
};
