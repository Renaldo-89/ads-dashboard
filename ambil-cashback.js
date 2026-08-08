/* =====================================================================
   AMBIL STATUS CASHBACK EVERPRO  ->  data/everpro-cashback.json
   ---------------------------------------------------------------------
   Cara pakai:
   1. Buka  https://customer.everpro.id/my-balance/revamp  (harus sudah login)
   2. Buka DevTools  ->  tab Console
   3. Ketik  allow pasting  lalu Enter (Chrome minta ini sekali saja)
   4. Tempel SELURUH isi berkas ini, tekan Enter
   5. Berkas everpro-cashback.json otomatis terunduh ke folder Download
   6. Pindahkan ke  ~/Documents/ads-dashboard/data/  lalu commit + push

   Berkas ini hanya berisi resi, nominal, tanggal dan nomor referensi.
   Tidak ada nama, nomor telepon, atau alamat pembeli.
   ===================================================================== */

(async () => {
  const HARI = 180;                              // rentang yang ditarik
  const STATUS = { 200: 'cair', 100: 'tertunda', 300: 'batal' };
  const LIMIT = 200;

  const ns = ms => ms * 1e6;
  const sampai = Date.now(), dari = sampai - HARI * 864e5;

  // --- pengenal kolom yang fleksibel, nama field API bisa berubah ---
  const ambil = (o, pola, kecuali) => {
    for (const k of Object.keys(o)) {
      if (kecuali && kecuali.test(k)) continue;
      if (pola.test(k) && o[k] !== null && o[k] !== '' && typeof o[k] !== 'object') return o[k];
    }
    return null;
  };
  const tanggalISO = v => {
    if (v == null) return null;
    if (typeof v === 'number') {                 // detik / milidetik / nanodetik
      const ms = v > 1e17 ? v / 1e6 : v > 1e14 ? v / 1e3 : v > 1e11 ? v : v * 1e3;
      return new Date(ms).toISOString().slice(0, 10);
    }
    const d = new Date(v);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  };
  // "Estimasi Pencairan 7 Agustus 2026" -> "2026-08-07"
  const BULAN_ID = { januari:1, februari:2, maret:3, april:4, mei:5, juni:6, juli:7,
    agustus:8, september:9, oktober:10, november:11, desember:12 };
  const estPencairan = teks => {
    const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(String(teks || ''));
    if (!m) return null;
    const b = BULAN_ID[m[2].toLowerCase()];
    if (!b) return null;
    return m[3] + '-' + String(b).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  };

  const isiArray = j => {
    const cari = x => {
      if (Array.isArray(x)) return x;
      if (x && typeof x === 'object')
        for (const k of ['data', 'mutations', 'list', 'items', 'records', 'result', 'rows']) {
          if (x[k]) { const h = cari(x[k]); if (h) return h; }
        }
      return null;
    };
    return cari(j) || [];
  };

  // --- cari token sesi ---
  // API mutasi menolak permintaan tanpa header Authorization, cookie saja tidak cukup.
  // Token disimpan aplikasi Everpro di penyimpanan peramban dengan nama yang berubah-ubah,
  // jadi dicari berdasarkan bentuknya: tiga bagian dipisah titik, diawali "eyJ".
  const POLA_JWT = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/;
  const gali = (o, dalam) => {
    dalam = dalam || 0;
    if (!o || dalam > 5) return null;
    if (typeof o === 'string') return POLA_JWT.test(o) ? o : null;
    if (typeof o !== 'object') return null;
    for (const v of Object.values(o)) { const t = gali(v, dalam + 1); if (t) return t; }
    return null;
  };
  function cariToken() {
    for (const gudang of [localStorage, sessionStorage]) {
      for (const k of Object.keys(gudang)) {
        const mentahNilai = String(gudang.getItem(k) || '').replace(/^"|"$/g, '');
        if (POLA_JWT.test(mentahNilai)) return mentahNilai;
        try { const t = gali(JSON.parse(mentahNilai)); if (t) return t; } catch (e) {}
      }
    }
    for (const c of document.cookie.split(';')) {
      const v = decodeURIComponent(c.split('=').slice(1).join('=') || '').trim();
      if (POLA_JWT.test(v)) return v;
    }
    return null;
  }

  // Everpro menyimpan tokennya dengan nama teracak, jadi kalau pencarian gagal
  // header Authorization dipinjam dari permintaan yang dikirim aplikasinya sendiri.
  function sadapHeader() {
    return new Promise(resolve => {
      const asli = window.fetch;
      const selesai = v => { window.fetch = asli; resolve(v); };
      const waktu = setTimeout(() => selesai(null), 6000);
      window.fetch = function (a, b) {
        try {
          const h = new Headers((b && b.headers) || (a && a.headers) || {});
          const v = h.get('Authorization');
          if (v && /^Bearer\s+\S+/i.test(v)) { clearTimeout(waktu); selesai(v); }
        } catch (e) {}
        return asli.apply(this, arguments);
      };
      // picu satu permintaan dengan berpindah tab mutasi
      const t = Array.from(document.querySelectorAll('*'))
        .filter(x => x.children.length === 0 && /Mutasi Tertunda/i.test(x.innerText || ''))[0];
      if (t) (t.closest('button') || t).click();
    });
  }

  const token = cariToken();
  let KEPALA;
  if (token) {
    KEPALA = { Authorization: 'Bearer ' + token, Accept: 'application/json' };
  } else {
    console.log('Token tidak ada di penyimpanan, menunggu permintaan halaman...');
    const pinjam = await sadapHeader();
    if (!pinjam) {
      console.error('Tidak berhasil membaca sesi. Muat ulang halaman, pastikan tabel mutasi '
        + 'sudah tampil, lalu jalankan skrip ini sekali lagi.');
      return;
    }
    KEPALA = { Authorization: pinjam, Accept: 'application/json' };
  }

  const semua = [];
  let mentah = null;

  for (const [kode, label] of Object.entries(STATUS)) {
    for (let skip = 0; skip < 5000; skip += LIMIT) {
      const u = '/api/wallet/v2/cash/mutations'
        + `?limit=${LIMIT}&skip=${skip}&type=&status=${kode}`
        + '&sort_by=-updated_at&transaction_types=&search='
        + `&created_at_gte=${ns(dari)}&created_at_lte=${ns(sampai)}`;
      let baris;
      try {
        const r = await fetch(u, { headers: KEPALA, credentials: 'include' });
        if (r.status === 400 || r.status === 401) {
          console.error('Sesi ditolak (' + r.status + '). Muat ulang halaman lalu ulangi skrip ini.');
          return;
        }
        if (!r.ok) { console.warn('gagal', kode, r.status); break; }
        const j = await r.json();
        if (!mentah) mentah = isiArray(j)[0] || null;
        baris = isiArray(j);
      } catch (e) { console.warn('galat', kode, e); break; }

      if (!baris.length) break;

      for (const b of baris) {
        // Nama medan sesuai jawaban asli Everpro:
        //   unique_id = CB-xxx, reference_number = resi, header = TRD-xxx,
        //   nominal = nilai, created_at = nanodetik, additional_info = "Estimasi Pencairan 7 Agustus 2026"
        const ref = String(b.unique_id || '');
        const cashback = /cashback/i.test(String(b.header_description || '')) || /^CB-/i.test(ref);
        if (!cashback) continue;

        const resi = String(b.reference_number || '').split(',')[0].trim();
        if (!resi) continue;

        semua.push({
          resi,
          status: label,
          jumlah: Number(b.nominal) || Number(b.nett_amount) || 0,
          tanggal: tanggalISO(b.created_at),
          est: estPencairan(b.additional_info),   // hanya terisi pada mutasi tertunda
          ref,
          order_id: String(b.header || '') || null,
        });
      }
      if (baris.length < LIMIT) break;
    }
  }

  // satu resi bisa punya lebih dari satu baris, status paling maju yang menang
  // sehingga cashback yang sudah cair tidak lagi terhitung tertunda
  const urutan = { cair: 3, tertunda: 2, batal: 1 };
  const peta = new Map();
  for (const x of semua) {
    const k = x.resi.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const l = peta.get(k);
    if (!l || urutan[x.status] > urutan[l.status]) peta.set(k, x);
    else if (urutan[x.status] === urutan[l.status]) l.jumlah += x.jumlah;
  }

  const hasil = {
    updated_at: new Date().toISOString(),
    dari: new Date(dari).toISOString().slice(0, 10),
    sampai: new Date(sampai).toISOString().slice(0, 10),
    jumlah: peta.size,
    _contoh_mentah: mentah,                       // untuk memeriksa nama field
    data: [...peta.values()].sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal))),
  };

  console.table(hasil.data.slice(0, 10));
  const hari = new Date().toISOString().slice(0, 10);
  const telat = hasil.data.filter(x => x.status === 'tertunda' && x.est && x.est < hari);
  console.log('Total resi dengan cashback:', hasil.jumlah,
    '| cair:', hasil.data.filter(x => x.status === 'cair').length,
    '| tertunda:', hasil.data.filter(x => x.status === 'tertunda').length,
    '| batal:', hasil.data.filter(x => x.status === 'batal').length,
    '| lewat jatuh tempo:', telat.length,
    '(Rp' + telat.reduce((a, x) => a + x.jumlah, 0).toLocaleString('id-ID') + ')');

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(hasil, null, 1)],
    { type: 'application/json' }));
  a.download = 'everpro-cashback.json';
  a.click();
})();
