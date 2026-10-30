// Hiro Ads Data — Google Ads Script
// Tempel di SETIAP akun Google Ads: Tools > Bulk actions > Scripts > + > tempel > Authorize > Save.
// Jadwal: Frequency = Hourly. Script menulis ke tab "gads_<ID akun>" di Sheet.

var SHEET_URL = 'https://docs.google.com/spreadsheets/d/1eIAa0PtyFPuBxVOhbKm5hP93g68k-Cf4Dug5crPwvs0/edit';
var HARI = 60; // jumlah hari ke belakang

function main() {
  var akun = AdsApp.currentAccount();
  var id = akun.getCustomerId().replace(/-/g, '');
  var nama = akun.getName();
  var tz = AdsApp.currentAccount().getTimeZone();
  var akhir = new Date();
  var awal = new Date(akhir.getTime() - HARI * 86400000);
  var f = function (d) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); };

  var q = 'SELECT campaign.name, segments.date, metrics.cost_micros, metrics.clicks, ' +
          'metrics.impressions, metrics.conversions, metrics.conversions_value ' +
          'FROM campaign WHERE segments.date BETWEEN "' + f(awal) + '" AND "' + f(akhir) + '" ' +
          'AND metrics.impressions > 0';
  var it = AdsApp.report(q).rows();

  var baris = [['account_id', 'account_name', 'campaign', 'date', 'spend', 'clicks', 'impressions', 'conversions', 'conv_value']];
  while (it.hasNext()) {
    var r = it.next();
    baris.push([
      id, nama, r['campaign.name'], r['segments.date'],
      Number(r['metrics.cost_micros']) / 1e6,
      Number(r['metrics.clicks']), Number(r['metrics.impressions']),
      Number(r['metrics.conversions']), Number(r['metrics.conversions_value'])
    ]);
  }

  var ss = SpreadsheetApp.openByUrl(SHEET_URL);
  var tab = 'gads_' + id;
  var sh = ss.getSheetByName(tab) || ss.insertSheet(tab);
  sh.clearContents();
  sh.getRange(1, 1, baris.length, baris[0].length).setValues(baris);
  Logger.log(tab + ': ' + (baris.length - 1) + ' baris');
}
