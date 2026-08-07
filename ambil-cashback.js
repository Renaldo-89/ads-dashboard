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
        const r = await fetch(u, { credentials: 'include' });
        if (!r.ok) { console.warn('gagal', kode, r.status); break; }
        const j = await r.json();
        if (!mentah) mentah = isiArray(j)[0] || null;
        baris = isiArray(j);
      } catch (e) { console.warn('galat', kode, e); break; }

      if (!baris.length) break;

      for (const b of baris) {
        const jenis = String(ambil(b, /(transaction_)?type_?(name|label|desc)?$|jenis/i) || '');
        const ref = String(ambil(b, /reference|ref_?(no|number|code)|no_referensi/i) || '');
        const cashback = /cashback/i.test(jenis) || /^CB-/i.test(ref);
        if (!cashback) continue;

        const resi = String(ambil(b, /awb|resi|waybill|tracking/i) || '')
          .split(',')[0].trim();
        if (!resi) continue;

        semua.push({
          resi,
          status: label,
          jumlah: Number(ambil(b, /^(amount|nominal|jumlah|value)$/i)
            ?? ambil(b, /amount|nominal|jumlah/i) ?? 0),
          tanggal: tanggalISO(ambil(b, /created_?at|tanggal|date|trans(action)?_?time/i)),
          // perkiraan tanggal cair, hanya ada pada mutasi tertunda
          est: tanggalISO(ambil(b, /est(imate|imasi)?_?|disburse|pencairan|payout|settle/i)),
          ref,
          order_id: String(ambil(b, /order_?(id|no|number)|trd|no_order/i, /^id$/i) || '') || null,
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
