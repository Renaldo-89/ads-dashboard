#!/bin/zsh
# Sinkronisasi Everpro otomatis: tarik data, simpan, kirim ke GitHub.
# Dijalankan oleh launchd setiap hari. Log ada di everpro-sync.log

REPO="$HOME/Documents/ads-dashboard"
LOG="$REPO/everpro-sync.log"
HARI=35

cd "$REPO" || exit 1

echo "" >> "$LOG"
echo "===== $(date '+%Y-%m-%d %H:%M:%S') =====" >> "$LOG"

# jalankan penarikan data
if ! /usr/bin/python3 "$REPO/everpro-sync.py" "$HARI" >> "$LOG" 2>&1; then
  echo "GAGAL menarik data Everpro" >> "$LOG"
  /usr/bin/osascript -e 'display notification "Token Everpro mungkin kedaluwarsa. Buka Terminal dan perbarui .env" with title "Sinkronisasi Everpro gagal"' 2>/dev/null
  exit 1
fi

# kirim ke GitHub hanya kalau ada perubahan
/usr/bin/git add data/everpro.json >> "$LOG" 2>&1
if /usr/bin/git diff --staged --quiet; then
  echo "Tidak ada perubahan data." >> "$LOG"
  exit 0
fi

/usr/bin/git commit -m "Perbarui data Everpro" >> "$LOG" 2>&1
/usr/bin/git pull --rebase >> "$LOG" 2>&1
if /usr/bin/git push >> "$LOG" 2>&1; then
  echo "Terkirim ke GitHub." >> "$LOG"
else
  echo "GAGAL push ke GitHub." >> "$LOG"
  /usr/bin/osascript -e 'display notification "Data tersimpan tapi gagal dikirim ke GitHub" with title "Sinkronisasi Everpro"' 2>/dev/null
  exit 1
fi
