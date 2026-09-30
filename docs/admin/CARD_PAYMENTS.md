# Kartu kredit / debit → otomatis masuk rekening BNI

Stripe tidak menerima merchant Indonesia, jadi pembayaran kartu (Visa, Mastercard, JCB, Amex) di AXTO dijalankan oleh **prosesor kartu berizin di Indonesia — Xendit atau Midtrans**. Prosesor itulah yang **mencairkan (settle) dana secara otomatis ke rekening bank terdaftar Anda (BNI)**. AXTO tidak pernah menyimpan data kartu.

## Langkah pengaturan (sekali saja)

1. **Di dashboard prosesor** (pilih salah satu):
   - **Xendit** → aktifkan *Cards*; *Settings → Bank accounts / Withdrawal*: daftarkan rekening BNI Anda (mis. IDR 2090571484 a.n. YUSRON EFENDI) dan aktifkan penarikan/settlement otomatis; *Settings → Webhooks*: URL `https://axto.io/api/webhooks/xendit` (event *Invoices → paid*), salin *Callback verification token*.
   - **Midtrans** → aktifkan *Credit card* (3-D Secure); rekening settlement BNI didaftarkan saat onboarding/di *Settings*; *Payment → Notification URL*: `https://axto.io/api/webhooks/midtrans`.
2. **Di AXTO → Admin → Payment & email**:
   - Isi kartu **Xendit** (Secret key + Callback token) atau **Midtrans** (Server key) di tab Live (tab Sandbox untuk uji).
   - Isi kartu **Credit / debit card**: `processor` = `xendit` atau `midtrans`; `charge_currency` = `IDR` (default) atau `USD` (hanya Xendit dengan kartu USD aktif); `settlement_account` = catatan rekening BNI (hanya terlihat admin).
   - Tekan **Test** lalu nyalakan **Offer at checkout**.
3. Member kini melihat opsi **Credit / debit card** di checkout paket; pembayaran dikonfirmasi otomatis lewat webhook prosesor (jumlah diverifikasi), paket aktif, dan dana cair ke BNI sesuai jadwal settlement prosesor.

## Mata uang
- **IDR (disarankan)**: harga USD dikonversi dengan kurs USD→IDR (Admin → Settings, atau kurs publik harian), dibulatkan ke Rp1.000 — masuk ke rekening **BNI IDR**.
- **USD**: kartu ditagih dalam USD (Xendit, bila akun Anda mendukung). Pencairan ke rekening **BNI USD** (2090571495) tergantung kontrak/fitur akun Xendit Anda — konfirmasikan ke Xendit.
- Yang diterima di BNI adalah jumlah bersih setelah biaya prosesor.

## Jujur soal batasan
- "Otomatis ke BNI" dilakukan oleh settlement prosesor, bukan oleh AXTO; jadwalnya (mis. T+1/T+2) ditentukan prosesor.
- Transaksi kartu dapat di-chargeback oleh pemegang kartu.
- Untuk nominal besar (lisensi lifetime, akuisisi situs) gunakan wire BNI atau kripto; kartu tidak ditawarkan di sana.
