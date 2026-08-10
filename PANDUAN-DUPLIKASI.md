# Hiro Dashboard — Panduan Duplikasi

Panduan untuk membangun ulang sistem ini dari nol. Ditulis untuk orang yang
memakai **Google Ads + Globemerce + Everpro**, sama seperti sistem aslinya.

Tidak perlu bisa coding. Semua kode ditulis oleh Claude; tugasmu menyiapkan akun,
menempel kunci, dan menekan tombol Deploy.

Perkiraan waktu: **3–5 jam** kalau lancar, tersebar dalam beberapa sesi.

---

## 1. Apa yang kamu dapat

Satu halaman web pribadi yang menggabungkan tiga sumber yang selama ini terpisah:

| Halaman | Isinya |
|---|---|
| Overview | GMV, omzet, produk terjual, gross profit, biaya iklan, ROAS, dan **laba setelah iklan** |
| Sales | Rekap penjualan gabungan |
| Globemerce | Daftar pesanan lengkap, GMV personal dan grup |
| Everpro | Status pengiriman dan pelacakan pencairan cashback |
| Customer Service | Peringkat performa tiap CS dengan podium |
| Google Ads | Metrik iklan, lelang, performa per jam, kata kunci |

Bisa dibuka di komputer maupun dipasang di layar utama iPhone seperti aplikasi.
Ada mode terang dan gelap.

---

## 2. Cara kerjanya

```
  Google Ads ──▶ Windsor.ai ─┐
                             │
  Globemerce ────────────────┼──▶ Cloudflare Worker ──▶ GitHub Pages ──▶ Peramban
                             │      (menyimpan kunci)     (halaman HTML)
  Everpro ───────────────────┘
```

**Kenapa harus ada Worker di tengah?** Dua alasan, dan keduanya tidak bisa dihindari:

1. **Kunci API tidak boleh sampai ke peramban.** Kalau halaman memanggil Windsor
   langsung, kunci API-mu terbaca siapa saja lewat View Source.
2. **CORS.** Globemerce dan Windsor menolak panggilan langsung dari domain lain.
   Worker berjalan di server, jadi tidak terkena aturan itu.

Halaman HTML-nya sendiri **tidak menyimpan data apa pun**. Setiap kali dibuka, dia
menarik ulang dari Worker. Jadi tidak ada data pelanggan yang mengendap di repo.

---

## 3. Yang perlu disiapkan

| Akun | Biaya | Untuk apa |
|---|---|---|
| GitHub | gratis | Menyimpan dan menayangkan halaman |
| Cloudflare | gratis | Worker sebagai perantara |
| Windsor.ai | ada paket gratis | Menarik data Google Ads |
| Globemerce | punyamu | Sumber pesanan dan omzet |
| Everpro | punyamu | Pengiriman dan cashback |

Ditambah **Claude** — Claude Code di Terminal, atau Cowork di aplikasi desktop.
Cowork lebih mudah kalau kamu tidak terbiasa dengan Terminal.

---

## 4. Urutan pemasangan

Kerjakan berurutan. Tiap langkah bergantung pada langkah sebelumnya.

### Langkah 1 — Repo dan halaman kosong

1. Buat repo GitHub baru, misalnya `ads-dashboard`. **Publik** (GitHub Pages gratis
   hanya untuk repo publik).
2. Settings → Pages → Source: `main`, folder `/ (root)` → Save.
3. Tunggu 1–2 menit. Alamatmu jadi `https://<username>.github.io/ads-dashboard/`.

### Langkah 2 — Windsor.ai dan Google Ads

1. Daftar di windsor.ai, sambungkan akun Google Ads lewat OAuth.
2. Salin API key-nya. **Jangan tempel ke chat mana pun** — nanti langsung ke Cloudflare.

> Tautan otorisasi Windsor hanya berlaku sekali pakai. Kalau gagal, minta yang baru.

### Langkah 3 — Cloudflare Worker

1. dash.cloudflare.com → Workers & Pages → Create → Worker. Beri nama, misal `ads-proxy`.
2. Minta Claude menuliskan isi `worker.js` (lihat prompt di bagian 6).
3. Edit code → tempel → Deploy.
4. Settings → Variables and Secrets → tambahkan sebagai **Secret**, bukan Text:

| Nama Secret | Isinya |
|---|---|
| `WINDSOR_API_KEY` | API key Windsor.ai |
| `GLOBEMERCE_TOKEN` | Token sesi Globemerce (lihat Langkah 4) |
| `EVERPRO_CLIENT_KEY` | Client key dari developer.everpro.id |
| `EVERPRO_CLIENT_SECRET` | Client secret dari developer.everpro.id |
| `DASHBOARD_KEY` | Sandi bebas untuk mengunci dashboard |

Nama harus **persis** seperti di atas, huruf besar semua. Salah satu huruf saja,
Worker akan menjawab "belum diset".

### Langkah 4 — Token Globemerce

Globemerce tidak punya API resmi, jadi tokennya diambil dari sesi login sendiri.

1. Login di `web.globemerce.com`.
2. Buka DevTools dengan `Cmd + Option + J` (Mac) atau `F12` (Windows).
3. Tab Console, ketik `allow pasting` lalu Enter (sekali seumur hidup per peramban).
4. Tempel ini, Enter:

```js
copy(JSON.parse(localStorage.getItem('authState.token')))
```

5. Tokennya sudah ada di clipboard. Tempel langsung ke Cloudflare sebagai
   `GLOBEMERCE_TOKEN`.

> **Token ini kedaluwarsa.** Kalau suatu hari data Globemerce hilang dari
> dashboard sementara Google Ads masih jalan, hampir pasti tokennya habis.
> Ulangi langkah ini.

### Langkah 5 — API Everpro

1. Daftar di `developer.everpro.id`, buat aplikasi, ambil client key dan secret.
2. Masukkan ke Cloudflare sebagai `EVERPRO_CLIENT_KEY` dan `EVERPRO_CLIENT_SECRET`.

Everpro punya API resmi, jadi tidak perlu token sesi. Lebih awet dari Globemerce.

### Langkah 6 — Halaman dashboard

Minta Claude membuat `kerja.html` (prompt di bagian 6), taruh di repo, lalu:

```bash
git add -A && git commit -m "Dashboard awal" && git push
```

### Langkah 7 — Kunci dashboard

Halamanmu publik. Siapa pun yang tahu alamatnya bisa melihat data penjualan dan
nomor telepon pelangganmu. **Jangan lewati langkah ini.**

Pengamanannya dua lapis:

1. **Batas domain di Worker** — hanya `https://<username>.github.io` yang boleh
   memanggil. Peramban tidak mengizinkan situs lain memalsukan header `Origin`,
   jadi lapis ini nyata.
2. **Sandi** — dashboard meminta sandi sekali, disimpan di peramban, lalu ikut
   di tiap permintaan lewat header `X-Kunci`.

Uji dengan membuka situs lain mana pun, lalu di Console jalankan:

```js
fetch('https://<worker-mu>.workers.dev/?sales=globemerce&date_from=2026-01-01&date_to=2026-01-31')
  .then(r => r.text()).then(console.log).catch(e => console.log('DITOLAK', e))
```

Harus **DITOLAK**. Kalau justru keluar datamu, pembatasannya belum jalan.

---

## 5. Jebakan yang sudah kami temui

Bagian ini yang paling menghemat waktumu. Semua ini kami temukan dengan cara susah.

**Globemerce menyimpan wilayah sebagai nomor.** `receiver_province: "23"` itu
Kalimantan Timur. Padanannya ada di `GET /location/province` (42 provinsi).
`receiver_city` dan `receiver_state` justru kosong — pakai `receiver_regency`.

**Nomor order GoSend disisipkan di nama penerima.** Bukan di kolom referensi,
tapi di dalam teks seperti `IQBAL HABIB no order #2491113`. Harus diambil pakai
regex `#\s*(\d{6,10})`.

**API saldo Everpro butuh header Authorization, bukan cookie.** Tokennya disimpan
dengan nama teracak sehingga tidak bisa dicari berdasarkan nama. Cara paling andal:
sadap header dari permintaan yang dikirim aplikasinya sendiri.

**Halaman My Balance Everpro tidak punya endpoint resmi.** Data pencairan cashback
harus diambil dari `/api/wallet/v2/cash/mutations` dengan `status=200` (cair),
`100` (tertunda), `300` (batal). Nama medannya: `reference_number` = resi,
`unique_id` = nomor CB, `nominal` = nilai, `additional_info` = estimasi pencairan.

**Cloudflare Worker diblokir bot protection Everpro** di domain `customer.everpro.id`.
Jangan coba menembusnya. Pakai API resmi di `client-api.everpro.id`, atau jalankan
dari peramban sendiri.

**Globemerce hanya menyediakan rekap bulanan** untuk gross profit. Jadi kalau kamu
pilih periode 7 hari, angka penjualannya tetap sebulan penuh sementara biaya iklan
mengikuti 7 hari. Beri catatan di halaman supaya tidak menyesatkan.

**Chart.js tidak mengerti `var(--warna)`.** Canvas butuh nilai warna sungguhan.
Kalau kamu pakai variabel CSS untuk tema, sediakan fungsi penerjemah dan panggil
sebelum warnanya masuk ke konfigurasi grafik.

**Hati-hati nama kelas CSS yang tabrakan.** Kami pernah memakai `.gmv` untuk wadah
grid `minmax(270px,1fr)` sekaligus untuk angka kecil di dalam podium. Akibatnya
angka itu dipaksa selebar 270px dan seluruh halaman melebar di ponsel.

**Pakai `minmax(min(270px,100%),1fr)`, bukan `minmax(270px,1fr)`.** Bedanya, versi
pertama menyusut mengikuti layar sempit alih-alih memaksa halaman melebar.

**GitHub Actions bisa menulis ke repo yang sama.** Kalau kamu pasang penarik data
berkala, selalu `git add` dan `commit` dulu, baru `git pull --rebase`, baru `push`.
Kalau tidak, push-mu akan ditolak.

**"Copy value" di DevTools memotong teks panjang.** Token 402 karakter bisa
terpotong jadi 232 tanpa peringatan. Pakai `copy()` di Console seperti di Langkah 4.

---

## 6. Prompt untuk Claude

Tempel satu per satu, berurutan. Tunggu tiap tahap selesai sebelum lanjut.

### Prompt 1 — Worker

```
Saya mau membuat dashboard yang menggabungkan Google Ads, Globemerce, dan Everpro.
Tolong buatkan satu berkas worker.js untuk Cloudflare Worker yang jadi perantara.

Yang harus dilakukan Worker:

1. Google Ads lewat Windsor.ai
   - GET https://connectors.windsor.ai/all?api_key=<WINDSOR_API_KEY>&date_preset=...
   - Teruskan parameter connector, fields, date_from, date_to
   - Izinkan connector: google_ads, facebook, tiktok, tiktok_shop

2. Globemerce di https://gateway.globemerce.com, header Authorization Bearer
   - /myorder/all/listing?periodFrom=&periodTo=&client_code=All&page_size=100&page=N
     Ambil semua halaman sampai habis.
   - /dashboard/total_sales?year=&month=  -> omzet dan jumlah produk
   - /dashboard/total_profit?year=        -> omzet, HPP, gross profit
   - /dashboard/repeat_order?year=        -> pelanggan baru vs repeat
   - /location/province                   -> padanan nomor provinsi ke nama,
                                             tarik sekali lalu simpan
   Rapikan tiap pesanan jadi: no, tanggal, status, kurir, resi, pembeli, telepon,
   provinsi, kota, agen (dari sender_name), jenis_pembeli, pv, omzet, modal, profit.
   Nomor telepon gabungkan dari receiver_mobile_prefix + receiver_mobile.

3. Everpro lewat API resmi di https://client-api.everpro.id
   - POST /auth/v1/token dengan client_key dan client_secret, token berlaku 24 jam,
     simpan di memori supaya tidak minta ulang tiap permintaan
   - GET /shipment/v1/orders untuk daftar pengiriman
   Terjemahkan status_id: 300 menunggu pickup, 400 dalam proses, 404 menuju penerima,
   500 terkirim, 700 dibatalkan, 702 retur, 703 hilang atau rusak, 704 gagal.

4. Keamanan
   - Hanya izinkan asal https://<username>.github.io dan localhost.
     Tolak 403 sebelum menyentuh sumber data mana pun.
   - Minta sandi lewat header X-Kunci, bandingkan dengan Secret DASHBOARD_KEY
     memakai perbandingan berwaktu tetap. Tolak 401 kalau salah.
   - Cache di tepi Cloudflare 5 menit, dengan parameter ?bust= untuk memaksa segar.
     Asal ikut jadi bagian kunci cache, sandi jangan.

Semua kunci dibaca dari env, jangan pernah ditulis di kode.
Tulis komentar dalam bahasa Indonesia, jelaskan alasan bukan sekadar apa yang dilakukan.
```

### Prompt 2 — Halaman dashboard

```
Sekarang buatkan kerja.html, satu berkas mandiri tanpa build step, memanggil
Worker tadi. Chart.js dari CDN jsDelivr.

Tata letak: sidebar kiri berisi menu, konten di kanan, chip periode di atas
(Hari ini, Kemarin, 7 hari, 14 hari, 30 hari, dan 8 bulan terakhir).
Jangan pakai dropdown, saya tidak suka.

Halaman:
- Overview: kartu GMV personal dan grup di paling atas, lalu Ringkasan pendapatan
  (omzet, produk terjual, total transaksi, gross profit, biaya iklan, ROAS,
  pelanggan baru, pelanggan repeat), lalu kartu besar Laba setelah iklan yang
  disorot, lalu margin kotor dan biaya iklan per produk, lalu metrik iklan,
  rincian per akun dan kampanye, tren harian, ringkas per platform, rincian harian
- Sales, Globemerce, Everpro, Customer Service, Google Ads

Ketentuan:
- Semua warna lewat variabel CSS, siapkan mode terang dan gelap dengan tombol
- Chart.js tidak mengerti var(), sediakan fungsi penerjemah warna
- Data berat (per jam, lelang, kata kunci) ditarik hanya saat halamannya dibuka,
  dan tiap halaman menarik miliknya sendiri, jangan ketiganya sekaligus
- Harus muat di 320px sampai 1440px tanpa halaman melebar ke samping
- Bedakan "belum terhubung" dari "terhubung tapi periode ini kosong"
- Minta sandi sekali, simpan di localStorage, kirim lewat header X-Kunci
- Bahasa Indonesia, angka format Indonesia (Rp1.234, 12,5%)
```

### Prompt 3 — Halaman Customer Service

```
Tambahkan halaman Customer Service. Nama CS dibaca dari kolom Sender di Globemerce
(medan "agen" yang sudah dikeluarkan Worker).

Isinya:
- Kartu ringkasan: total GMV, total order, jumlah CS aktif, pelanggan baru,
  pelanggan repeat, pengiriman bermasalah, order terlacak di Everpro
- Podium tiga besar berdasarkan GMV point, juara di tengah dengan mahkota,
  balok tumbuh dari bawah saat halaman dibuka
- Tabel perbandingan antar CS
- Chip untuk memilih CS, lalu tabel pelanggan berisi tanggal, no order, pembeli,
  telepon, provinsi, resi, kurir, dan status kirim dari Everpro

Sediakan daftar nama yang bukan CS (misalnya order sendiri atau advertiser) supaya
bisa dikeluarkan dari peringkat, tapi tetap muncul sebagai catatan kecil berikut
alasannya, supaya totalnya masih bisa dicocokkan dengan halaman Globemerce.

Sediakan juga daftar alias supaya nama tampilan bisa berbeda dari nama di Globemerce.
```

### Prompt 4 — Pelacakan cashback

```
Tambahkan pelacakan pencairan cashback Everpro di halaman Everpro.

Datanya tidak ada di API resmi. Ambil dari halaman My Balance dengan skrip yang
dijalankan di Console peramban sendiri:
/api/wallet/v2/cash/mutations?limit=200&skip=0&status=<kode>&created_at_gte=<ns>&created_at_lte=<ns>
Kode status: 200 cair, 100 tertunda, 300 batal. Tanggal dalam nanodetik.

Medannya: reference_number = resi, unique_id = nomor CB, nominal = nilai,
created_at = nanodetik, additional_info = "Estimasi Pencairan 7 Agustus 2026",
header_description mengandung kata Cashback.

API-nya butuh header Authorization Bearer, cookie saja ditolak. Token disimpan
dengan nama teracak, jadi sadap saja header dari permintaan yang dikirim
aplikasinya sendiri.

Keluarkan berkas data/everpro-cashback.json berisi resi, status, jumlah, tanggal,
est, ref, order_id. Satu resi satu baris, status paling maju yang menang.

Di dashboard, tampilkan kartu cashback cair dan belum cair mengikuti periode,
tandai merah yang estimasi pencairannya sudah lewat, dan cocokkan ke tiap
pengiriman lewat resi.
```

### Prompt 5 — Pemeriksaan

```
Sebelum saya push, tolong periksa:

1. Sintaks semua blok script
2. Tidak ada warna terang yang terkunci di mode gelap. Periksa SEMUA format:
   #RGB, #RRGGBB, rgb(), rgba(), dan yang ada di dalam gradient. Jangan lewatkan
   satu format pun, di situlah bug biasanya lolos.
3. Lebar dokumen tidak melebihi lebar layar pada 320, 375, 390, 430, 768, 1024,
   dan 1440 piksel
4. Semua variabel CSS yang dipakai punya definisi di kedua tema
5. Warna yang masuk ke Chart.js sudah berupa nilai sungguhan, bukan var()

Laporkan temuannya, jangan langsung diperbaiki.
```

---

## 7. Perawatan

| Kapan | Yang dilakukan |
|---|---|
| Saat data Globemerce hilang | Ambil ulang `GLOBEMERCE_TOKEN` (Langkah 4) |
| Tiap beberapa minggu | Jalankan skrip cashback untuk menyegarkan datanya |
| Setelah ubah `worker.js` | Tempel ulang ke Cloudflare, klik Deploy |
| Setelah ubah `kerja.html` | `git add -A && git commit -m "..." && git pull --rebase && git push` |

---

## 8. Yang sengaja tidak dilakukan

Supaya kamu tidak mengulang perdebatan yang sudah selesai:

**Tidak menembus bot protection Everpro.** Itu mekanisme keamanan milik mereka.
Jalan yang benar adalah API resmi.

**Tidak menyimpan data pelanggan di repo.** Repo-nya publik. Nama, telepon, dan
alamat hanya lewat saat halaman dibuka, tidak pernah ditulis ke berkas. Yang boleh
disimpan cuma resi, nomor order, status, dan nominal.

**Tidak menaruh sandi di dalam HTML.** Sandi diketik pengguna dan disimpan di
peramban masing-masing. Kalau ditulis di kode, dia ikut masuk ke riwayat git
selamanya, dan repo-nya publik.

**Tidak memakai Cloudflare Access.** Access butuh domain sendiri yang jadi zona
aktif di Cloudflare; subdomain `workers.dev` tidak didukung. Kalau kamu sudah punya
domain, Access lebih baik daripada sandi bersama karena bisa login per orang dan
dicabut satu-satu.

---

## 9. Kalau macet

Sebutkan ke Claude: apa yang kamu lakukan, apa yang muncul, dan **salin pesan
galat di Console apa adanya**. Pesan galat yang utuh jauh lebih berguna daripada
"tidak jalan".

Kalau dashboard tidak memuat data sama sekali, periksa berurutan:

1. Buka Console, lihat ada galat apa
2. Cek apakah Worker menjawab: buka alamat Worker langsung di tab baru
3. Kalau jawabannya "belum diset", berarti nama Secret-nya salah ketik
4. Kalau 401, sandinya salah — hapus dengan `localStorage.removeItem('kunci')`
   lalu muat ulang
5. Kalau 403, asal domainmu belum masuk daftar izin di Worker
