#!/bin/zsh
# LANGKAH 1 — jalankan di MAC LAMA.
# Membungkus semua yang tidak ada di GitHub ke satu folder di Desktop:
#   worker.js, .env (token Everpro), dan jadwal launchd Everpro.
# Folder hasilnya BERISI RAHASIA: pindahkan lewat AirDrop / kabel / flashdisk,
# jangan diunggah ke GitHub atau dikirim lewat chat, dan hapus setelah selesai.

REPO="$HOME/Documents/ads-dashboard"
BEKAL="$HOME/Desktop/bekal-pindah-hiro"

if [ ! -d "$REPO" ]; then echo "Folder $REPO tidak ditemukan."; exit 1; fi
rm -rf "$BEKAL"; mkdir -p "$BEKAL/launchagents"

salin() {  # salin <sumber> <nama>
  if [ -f "$1" ]; then cp "$1" "$BEKAL/$2"; echo "OK    $2"; else echo "HILANG $2  ($1)"; fi
}
salin "$REPO/worker.js" "worker.js"
salin "$REPO/.env" ".env"

# jadwal launchd yang menjalankan everpro-auto.sh
ADA=0
for f in "$HOME"/Library/LaunchAgents/*.plist; do
  [ -f "$f" ] || continue
  if grep -q -i "everpro-auto\|ads-dashboard" "$f"; then
    cp "$f" "$BEKAL/launchagents/"; echo "OK    launchagents/$(basename "$f")"; ADA=1
  fi
done
[ "$ADA" = 0 ] && echo "PERHATIAN: jadwal Everpro tidak ditemukan di ~/Library/LaunchAgents. Kalau jadwalnya dibuat dengan cara lain (cron / crontab -l), catat dan pasang ulang secara manual."

# catatan keadaan git, supaya tidak ada pekerjaan yang tertinggal
cd "$REPO" && {
  echo "--- git status (harus bersih / sudah di-push) ---"
  git status --short
  echo "--- commit yang belum di-push ---"
  git log origin/main..HEAD --oneline
} > "$BEKAL/CEK-GIT.txt" 2>&1
cat "$BEKAL/CEK-GIT.txt"

echo ""
echo "Selesai. Pindahkan folder ini ke Mac baru:  $BEKAL"
open "$HOME/Desktop"
