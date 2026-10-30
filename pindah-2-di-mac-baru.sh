#!/bin/zsh
# LANGKAH 2 — jalankan di MAC BARU.
# Pakai:  zsh pindah-2-di-mac-baru.sh ~/Desktop/bekal-pindah-hiro
# (argumen = folder bekal dari Mac lama)
# Prasyarat: sudah login ke GitHub di Mac ini (git bisa push), dan Terminal
# punya izin akses Dokumen/Desktop (System Settings > Privacy & Security).

BEKAL="${1:-$HOME/Desktop/bekal-pindah-hiro}"
REPO="$HOME/Documents/ads-dashboard"

if [ ! -d "$BEKAL" ]; then echo "Folder bekal tidak ditemukan: $BEKAL"; exit 1; fi

# 1. kode dari GitHub
if [ ! -d "$REPO/.git" ]; then
  git clone https://github.com/Renaldo-89/ads-dashboard.git "$REPO" || { echo "Clone gagal. Pastikan sudah login GitHub."; exit 1; }
else
  (cd "$REPO" && git pull --rebase)
fi

# 2. file yang tidak ada di GitHub
[ -f "$BEKAL/worker.js" ] && cp "$BEKAL/worker.js" "$REPO/worker.js" && echo "OK worker.js"
[ -f "$BEKAL/.env" ] && cp "$BEKAL/.env" "$REPO/.env" && chmod 600 "$REPO/.env" && echo "OK .env"
chmod +x "$REPO/everpro-auto.sh" 2>/dev/null

# 3. jadwal launchd. Path di dalamnya disesuaikan dengan nama pengguna Mac baru.
mkdir -p "$HOME/Library/LaunchAgents"
for f in "$BEKAL"/launchagents/*.plist; do
  [ -f "$f" ] || continue
  nama="$(basename "$f")"
  sed -E "s#/Users/[^/]+/#$HOME/#g" "$f" > "$HOME/Library/LaunchAgents/$nama"
  launchctl unload "$HOME/Library/LaunchAgents/$nama" 2>/dev/null
  launchctl load "$HOME/Library/LaunchAgents/$nama" && echo "OK jadwal terpasang: $nama"
done

# 4. alat yang dibutuhkan
command -v python3 >/dev/null || echo "PERHATIAN: python3 belum ada. Jalankan: xcode-select --install"
command -v git >/dev/null || echo "PERHATIAN: git belum ada. Jalankan: xcode-select --install"

# 5. uji sekali
echo ""
echo "Uji sinkronisasi Everpro sekali..."
zsh "$REPO/everpro-auto.sh"
echo ""
echo "Hasil terakhir di log:"
tail -n 8 "$REPO/everpro-sync.log" 2>/dev/null
echo ""
echo "Kalau log berakhir dengan 'Terkirim ke GitHub' atau 'Tidak ada perubahan data', Mac baru sudah siap."
