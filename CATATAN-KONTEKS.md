# Catatan konteks — Hiro Dashboard

Tujuan file ini: memberi pegangan kepada percakapan Claude baru (atau orang baru)
supaya tidak mulai dari nol. Isinya ringkasan keputusan dan keadaan sistem per
**30 Oktober 2026**. Tidak ada rahasia (token, kunci, sandi) di sini — hanya nama
tempat menyimpannya.

Pemilik: Renaldo Ilham Zamzam. Bahasa kerja: Indonesia.

## 1. Gambaran sistem

- **Dashboard**: `kerja.html` (satu berkas) di GitHub Pages,
  `https://renaldo-89.github.io/ads-dashboard/kerja.html`, repo `Renaldo-89/ads-dashboard`.
  Setiap push ke `main` langsung tayang (butuh 1–3 menit; tab lama bisa menyimpan
  salinan lama — buka dengan `?v=angka` baru atau Cmd+Shift+R).
- **Worker Cloudflare** `ads-proxy`: berkasnya `worker.js` (**TIDAK ada di git**,
  masuk `.gitignore`). Di-deploy manual: Cloudflare > Workers & Pages > ads-proxy >
  Edit code > tempel > Deploy. Simpan salinan `worker.js` di tempat lain.
- **Data iklan**: Windsor.ai sudah **berhenti** (tidak dibayar). Penggantinya:
  Google Sheet "Hiro Ads Data" yang dibaca Worker lewat Google Service Account.
- **Penjualan**: Globemerce (token sesi, kedaluwarsa berkala) dan Everpro
  (API resmi lewat Worker). Jalur cadangan `everpro-sync.py` (launchd di Mac,
  hasilnya `data/everpro*.json`) **dimatikan 30 Okt 2026** di Mac lama dan Mac baru.

## 2. Alur data iklan (tanpa Windsor)

```
Google Ads Script (per akun, per jam) --> tab gads_<ID akun> di Sheet
Apps Script Meta (di Sheet, per jam)  --> tab meta_<ID akun>  di Sheet
Worker (Service Account) membaca Sheet --> ?connector=google_ads | facebook
Dashboard memanggil Worker             --> halaman Google Ads / Meta Ads
```

- Sheet ID ada di `google-ads-script.js` (SHEET_URL). Worker memakai secret
  `GADS_SHEET_ID`, `GADS_SA_EMAIL`, `GADS_SA_KEY`.
- Kolom `gads_`: account_id, account_name, campaign, date, spend, clicks,
  impressions, conversions, conv_value. Tab `meta_` menambah purchases, contacts
  (conversions = purchases + contacts).
- Script Google Ads **hanya menulis kampanye yang punya tayangan hari itu**
  (impressions > 0), jadi akun yang tidak tayang hari ini tidak punya baris hari ini.
  Itu normal, bukan error.
- Data yang **tidak tersedia** dari sumber Sheet: per jam, lelang (impression share),
  kata kunci pencarian. Worker menjawab 501 untuk field itu. TikTok Ads/TikTok Shop
  tidak ada penggantinya.
- Berkas terkait di repo: `google-ads-script.js`, `meta-ads-sheet.gs`.

### Akun yang tersambung (30 Okt 2026)

| Akun | Platform | Catatan |
|---|---|---|
| DEA ADS (525-218-4635) | Google Ads | script jalan lewat akun melidyasavelaa@gmail.com |
| MY ADS (136-395-5915) | Google Ads | akun murtini.mr21@gmail.com (dibuka di Opera) |
| ECHA ADS (537-689-5088) | Google Ads | script dibuat lewat akses Standar melidya |
| ADS INTAN (508-148-9452) | Google Ads | diundang dari intanfebrii28@gmail.com; ada 2 script (melidya + intan), keduanya per jam, redundan tapi aman |
| SVO RENALDO 01 (749921700453674) & 02 (348937270912208) | Meta | token di Properti Skrip Apps Script (`META_TOKEN`) |

### Menambah akun Google Ads baru

1. Jika login/passkey akun itu sulit: beri akun itu akses **Standar** ke
   melidyasavelaa@gmail.com (Admin > Akses dan keamanan), terima undangan lewat
   Gmail melidya.
2. Di akun itu: Alat > Tindakan massal > Skrip > + > tempel isi `google-ads-script.js`,
   nama "Hiro Ads Data" > **Otorisasi** (diklik manusia) > Simpan.
3. **Jalankan** (tanpa pratinjau). Kalau "Gagal karena error autentikasi", jalankan
   ulang setelah otorisasi selesai.
4. Di daftar skrip, ubah **Frekuensi** menjadi **Per jam** (default "Bulanan"/kosong —
   jangan sampai terlewat, data berhenti di hari terakhir dijalankan).
5. Cek tab `gads_<ID>` muncul di Sheet; akun otomatis tampil di dashboard.
   Tidak ada kode yang perlu diubah.

### Meta

- API Meta Marketing v21.0 dari Apps Script di Sheet. Token dibuat lewat System User
  di Business Manager; app "Hiro Ads Reader" (use case Marketing API) dengan system
  user di-assign ke app. Untuk token baru: Properti Skrip > `META_TOKEN`, jalankan
  `pasangJadwal()` sekali, `tarikMeta()` untuk uji.

## 3. Keputusan dan perilaku dashboard yang sudah disepakati

- **Filter akun/kampanye** (`buildFilters` di `kerja.html`): chip mengikuti platform
  halaman yang dibuka (Meta hanya akun Meta). >5 pilihan jadi dropdown. Daftar
  diingat di localStorage `hiro_reg_filter` supaya tidak hilang di periode pendek;
  yang tidak aktif di periode itu diredupkan. Ada tombol "Reset filter" dan pesan
  kosong yang menjelaskan sebab serta tombol aksi.
- **Grafik 1 hari**: titik tunggal tetap digambar, sumbu mulai dari nol.
- **Laporan Iklan**: ada filter akun iklan (nama akun dari laporan + akun platform).
- **Semangat harian**: pemilik/admin sekarang dikarang AI (Workers AI, kalimat
  baru tiap hari, tema bergilir, tanpa nama tokoh); kutipan tokoh dunia hanya
  cadangan bila AI gagal. CS tetap AI dengan tema CS. Disimpan di KV `TANDA_FU`
  per hari.
- Prinsip yang diikuti Claude di proyek ini: tidak memasukkan sandi/token/kunci ke
  formulir; otorisasi OAuth, ToS, dan konfirmasi passkey dilakukan manusia;
  periksa domain tautan email sebelum diklik.

## 4. Pindah Mac (30 Okt 2026)

- Skrip bantu: `pindah-1-di-mac-lama.sh`, `pindah-2-di-mac-baru.sh`.
- Yang hanya ada di Mac lama (tidak di git): `worker.js`, `.env`
  (`EVERPRO_TOKEN`), jadwal launchd `com.renaldo.everpro-sync.plist`.
- Mac baru: repo sudah di-clone. Jadwal Everpro sempat terpasang lalu dimatikan
  (30 Okt 2026), begitu juga di Mac lama. Token di `.env` sudah kedaluwarsa (13 Agu)
  dan tidak diperbarui karena umurnya hanya 7 hari; Everpro di dashboard tetap jalan
  lewat API resmi (client key/secret di Cloudflare). Untuk menghidupkan cadangan lagi:
  isi token baru di `.env`, lalu `launchctl load -w` plist-nya.
- Riwayat chat Cowork bersifat lokal per Mac (tidak ikut pindah). File ini
  pengganti konteksnya.

## 5. Pekerjaan tertunda / catatan

- **Cashback Everpro**: `data/everpro-cashback.json` terakhir diambil 7 Agustus 2026
  (usang >80 hari, dashboard menampilkan Rp0). Perbarui dengan menjalankan
  `ambil-cashback.js` di halaman My Balance Everpro.
- Hapus folder `bekal-pindah-hiro` (berisi token) di semua perangkat bila belum.
- **MY ADS**: pastikan Frekuensi "Per jam" tersimpan (diatur lewat Opera).
- **Peringatan Google**: Verifikasi 2 Langkah wajib mulai 2 Nov 2026 (akun melidya/DEA)
  dan 16 Nov 2026 (MY ADS). Jika akun script kehilangan akses, data berhenti.
- **Pembayaran Google Ads**: ECHA "Saldo hampir habis", ada kampanye dengan
  "payment failed".
- **TikTok Ads/Shop**: belum ada penggantinya.
- Hapus berkas JSON Service Account dari folder Unduhan (isinya sudah di secret Cloudflare).
- Sisa audit lama: batas percobaan login, banner kedaluwarsa token Globemerce,
  cadangkan `worker.js`.
- GitHub Action Windsor (`update-data.yml`) **di-disable 30 Okt 2026** lewat
  GitHub > Actions (berkasnya tetap ada; bisa Enable lagi). Sebelumnya action ini
  menulis pesan "payment failed" Windsor sebagai baris data ke `data/*.json`.

## 6. Cara memakai file ini di percakapan baru

Katakan: "Baca `CATATAN-KONTEKS.md`, `README.md`, dan `dokumentasi-sistem.html`
di folder ads-dashboard dulu, lalu lanjutkan." Setelah itu Claude punya konteks yang sama.
