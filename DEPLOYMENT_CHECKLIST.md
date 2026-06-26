# AXTO — Security Hardening Deployment Checklist

Baca ini sebelum men-deploy build hasil hardening ini ke produksi axto.io.
Penjelasan lengkap (kerentanan, perbaikan, hasil simulasi) ada di
`AXTO_Security_Hardening_Report.pdf` pada paket ini.

## 1. Generate keypair Ed25519 PRODUKSI BARU (WAJIB)

Keypair yang tertanam di build ini (`AXTO_LICENSE_PUBLIC_KEY_B64` di setiap
`license.py`, dan nilai demo di `dashboard/lib/license-signing.ts`) dibuat
khusus untuk audit ini dan didokumentasikan di laporan PDF — sehingga
**bagian privatenya tidak lagi rahasia** dan TIDAK BOLEH dipakai live.

```bash
python3 - <<'PY'
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
import base64
priv = ed25519.Ed25519PrivateKey.generate()
pub  = priv.public_key()
priv_raw = priv.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
pub_raw  = pub.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
print("PRIVATE:", base64.b64encode(priv_raw).decode())
print("PUBLIC :", base64.b64encode(pub_raw).decode())
PY
```

Simpan PRIVATE key sebagai secret di Cloudflare Pages:

```bash
wrangler pages secret put LICENSE_SIGNING_PRIVATE_KEY_B64
```

Lalu ganti `AXTO_LICENSE_PUBLIC_KEY_B64` di **setiap** file berikut dengan
PUBLIC key yang baru (cari-ganti satu nilai yang sama di semua file ini):

- `vault/src/license.py`, `soc/src/license.py`, `compliance/src/license.py`,
  `sentinel/src/license.py`, `edge/src/license.py`, `engine/src/license.py`,
  `antivirus/src/license.py`
- `orchestra/orchestra_core/license.py`
- `studio/src/license.py`, `gpu-studio/src/license.py`,
  `hybrid-studio/src/license.py`, `ai-studio/src/license.py`

## 2. Urutan rilis — dashboard DULU, baru engine

Setelah `LICENSE_SIGNING_PRIVATE_KEY_B64` ter-set dan dashboard ter-deploy,
setiap respons `/api/license-validate` akan ditandatangani. Engine versi
hardened (yang memverifikasi tanda tangan) **tidak akan mempercayai** respons
dari dashboard versi LAMA (yang belum menandatangani apa pun) — engine akan
memperlakukannya sama seperti server tak terjangkau.

Urutan yang aman:
1. Deploy dashboard hardened (dengan secret key sudah di-set) lebih dulu.
2. Verifikasi `/api/license-validate` benar-benar mengembalikan field
   `signature` dan `signed_payload` (test manual dengan satu license key).
3. Baru rilis build engine/produk hardened ke pelanggan.

## 3. Catatan kompatibilitas mundur

- Semua license key yang sudah diterbitkan ke pelanggan **tetap berfungsi
  tanpa perubahan apa pun** — perubahan checksum di `lib/license.ts` bersifat
  opsional/informatif, bukan validasi keras (lihat komentar di file
  tersebut).
- Pelanggan yang baru pertama kali deploy versi hardened ini dan kebetulan
  TIDAK punya koneksi ke axto.io pada saat startup pertama akan gagal start
  (tidak ada cache lokal lama untuk grace). Ini perilaku yang disengaja
  (fail-closed) — sampaikan ke pelanggan untuk memastikan konektivitas saat
  upgrade pertama kali. Setelah satu kali validasi sukses, grace period
  offline normal kembali berfungsi seperti biasa untuk gangguan jaringan
  berikutnya.

## 4. Variabel lingkungan baru (opsional)

| Variable | Wajib? | Fungsi |
|---|---|---|
| `LICENSE_SIGNING_PRIVATE_KEY_B64` | **Wajib** (dashboard) | Private key Ed25519 untuk menandatangani respons. |
| `LICENSE_KEY_HMAC_SECRET` | Opsional (dashboard) | Mengaktifkan checksum non-blocking pada key baru. |
| `AXTO_STATE_DIR` | Opsional (tiap produk on-prem) | Lokasi cache lisensi tersimpan. Default `/var/lib/axto` lalu `~/.axto`. |

## 5. Setelah deploy

- Pantau log untuk baris `RESPONSE SIGNATURE INVALID` — ini menandakan
  engine pelanggan masih mengarah ke dashboard lama, atau ada percobaan
  MITM/DNS-spoof yang berhasil dideteksi dan diblokir.
- Pantau tabel `license_heartbeats` untuk lonjakan jumlah IP berbeda per
  license_key dalam 24 jam — sinyal lunak kemungkinan key dibagi/dicuri
  (lihat §6 laporan PDF).
