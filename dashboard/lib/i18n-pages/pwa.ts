/* i18n for components/pwa/Pwa.tsx — all 10 portal languages.
 * Keys and array shapes must match `en` exactly (tests/i18n-pages.test.ts). */
import type { Lang } from "../i18n-shared";

const en = {
  install: "Install app",
  title: "Install AXTO on your phone",
  ios1: "Tap the Share button",
  ios2: "Choose “Add to Home Screen”",
  ios3: "Open AXTO from your home screen — full screen, no browser bar.",
  close: "Got it",
};

export const T: Record<Lang, typeof en> = {
  en: en,
  id: {
    install: "Install aplikasi",
    title: "Pasang AXTO di HP Anda",
    ios1: "Ketuk tombol Bagikan (Share)",
    ios2: "Pilih “Tambahkan ke Layar Utama”",
    ios3: "Buka AXTO dari layar utama — layar penuh, tanpa bilah browser.",
    close: "Mengerti",
  },
  ms: {
    install: "Pasang aplikasi",
    title: "Pasang AXTO pada telefon anda",
    ios1: "Ketik butang Kongsi",
    ios2: "Pilih “Tambah ke Skrin Utama”",
    ios3: "Buka AXTO dari skrin utama — skrin penuh, tanpa bar pelayar.",
    close: "Faham",
  },
  de: {
    install: "App installieren",
    title: "AXTO auf dem Smartphone installieren",
    ios1: "Tippen Sie auf „Teilen“",
    ios2: "Wählen Sie „Zum Home-Bildschirm“",
    ios3: "Öffnen Sie AXTO vom Home-Bildschirm – Vollbild, ohne Browserleiste.",
    close: "Verstanden",
  },
  fr: {
    install: "Installer l'appli",
    title: "Installer AXTO sur votre téléphone",
    ios1: "Touchez le bouton Partager",
    ios2: "Choisissez « Sur l'écran d'accueil »",
    ios3: "Ouvrez AXTO depuis l'écran d'accueil — plein écran, sans barre de navigateur.",
    close: "Compris",
  },
  it: {
    install: "Installa l'app",
    title: "Installa AXTO sul telefono",
    ios1: "Tocca il pulsante Condividi",
    ios2: "Scegli «Aggiungi alla schermata Home»",
    ios3: "Apri AXTO dalla schermata Home: a schermo intero, senza barra del browser.",
    close: "Ho capito",
  },
  zh: {
    install: "安装应用",
    title: "在手机上安装 AXTO",
    ios1: "点击“分享”按钮",
    ios2: "选择“添加到主屏幕”",
    ios3: "从主屏幕打开 AXTO——全屏显示，没有浏览器地址栏。",
    close: "知道了",
  },
  ja: {
    install: "アプリをインストール",
    title: "スマートフォンに AXTO をインストール",
    ios1: "共有ボタンをタップ",
    ios2: "「ホーム画面に追加」を選択",
    ios3: "ホーム画面から AXTO を開くと、ブラウザーバーのない全画面で使えます。",
    close: "OK",
  },
  hi: {
    install: "ऐप इंस्टॉल करें",
    title: "अपने फ़ोन पर AXTO इंस्टॉल करें",
    ios1: "शेयर बटन पर टैप करें",
    ios2: "“होम स्क्रीन पर जोड़ें” चुनें",
    ios3: "होम स्क्रीन से AXTO खोलें — फ़ुल स्क्रीन, बिना ब्राउज़र बार के।",
    close: "समझ गया",
  },
  ar: {
    install: "تثبيت التطبيق",
    title: "ثبّت AXTO على هاتفك",
    ios1: "اضغط زر المشاركة",
    ios2: "اختر «إضافة إلى الشاشة الرئيسية»",
    ios3: "افتح AXTO من الشاشة الرئيسية — ملء الشاشة دون شريط المتصفح.",
    close: "حسنًا",
  },
};
