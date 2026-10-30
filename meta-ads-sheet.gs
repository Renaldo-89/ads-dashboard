// Hiro — Meta Ads → Google Sheet
// Pasang di Sheet "Hiro Ads Data": Ekstensi > Apps Script > tempel > Simpan.
// Token TIDAK ditulis di kode. Simpan di: Setelan Project (ikon roda gigi) >
// Properti Skrip > Tambah properti: nama META_TOKEN, nilai = access token.
// Lalu jalankan fungsi pasangJadwal() sekali, dan jalankan tarikMeta() untuk uji.

var AKUN_META = ['749921700453674', '348937270912208']; // SVO RENALDO 01 & 02
var HARI_META = 35;
var VERSI_API = 'v21.0';

// Urutan pilihan jenis aksi (dipakai yang pertama ada).
var AKSI_PEMBELIAN = ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'];
var AKSI_KONTAK = ['omni_contact', 'contact', 'offsite_conversion.fb_pixel_contact',
  'onsite_conversion.messaging_conversation_started_7d'];

function pilih_(daftar, tipe) {
  for (var i = 0; i < tipe.length; i++) {
    for (var j = 0; j < daftar.length; j++) {
      if (daftar[j].action_type === tipe[i]) return Number(daftar[j].value) || 0;
    }
  }
  return 0;
}

function tarikMeta() {
  var token = PropertiesService.getScriptProperties().getProperty('META_TOKEN');
  if (!token) throw new Error('META_TOKEN belum diisi di Properti Skrip');
  var tz = 'Asia/Jakarta';
  var akhir = new Date();
  var awal = new Date(akhir.getTime() - HARI_META * 86400000);
  var f = function (d) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var jenisAksi = {};

  AKUN_META.forEach(function (id) {
    var url = 'https://graph.facebook.com/' + VERSI_API + '/act_' + id + '/insights'
      + '?level=campaign&time_increment=1&limit=500'
      + '&fields=account_id,account_name,campaign_name,spend,impressions,inline_link_clicks,actions,action_values'
      + '&time_range=' + encodeURIComponent(JSON.stringify({ since: f(awal), until: f(akhir) }))
      + '&access_token=' + encodeURIComponent(token);
    var baris = [['account_id', 'account_name', 'campaign', 'date', 'spend', 'clicks',
      'impressions', 'conversions', 'conv_value', 'purchases', 'contacts']];

    while (url) {
      var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      var j = JSON.parse(res.getContentText());
      if (j.error) throw new Error('Meta ' + id + ': ' + j.error.message);
      (j.data || []).forEach(function (r) {
        var aksi = r.actions || [], nilai = r.action_values || [];
        aksi.forEach(function (a) { jenisAksi[a.action_type] = 1; });
        var beli = pilih_(aksi, AKSI_PEMBELIAN);
        var kontak = pilih_(aksi, AKSI_KONTAK);
        baris.push([
          r.account_id, r.account_name, r.campaign_name, r.date_start,
          Number(r.spend) || 0, Number(r.inline_link_clicks) || 0, Number(r.impressions) || 0,
          beli + kontak, pilih_(nilai, AKSI_PEMBELIAN), beli, kontak
        ]);
      });
      url = j.paging && j.paging.next ? j.paging.next : null;
    }

    var tab = 'meta_' + id;
    var sh = ss.getSheetByName(tab) || ss.insertSheet(tab);
    sh.clearContents();
    sh.getRange(1, 1, baris.length, baris[0].length).setValues(baris);
    Logger.log(tab + ': ' + (baris.length - 1) + ' baris');
  });
  Logger.log('Jenis aksi yang ditemukan: ' + Object.keys(jenisAksi).join(', '));
}

// Jalankan sekali: membuat jadwal tarik tiap jam.
function pasangJadwal() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'tarikMeta') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('tarikMeta').timeBased().everyHours(1).create();
}
