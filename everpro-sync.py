#!/usr/bin/env python3
"""
Tarik data pengiriman Everpro dan simpan ke data/everpro.json

Dijalankan dari komputer sendiri, karena Everpro menolak permintaan
dari server (tantangan bot Cloudflare) tapi menerima dari IP rumah/kantor.

Token dibaca dari file .env di folder yang sama:
    EVERPRO_TOKEN=Bearer eyJ...

Pakai:
    python3 everpro-sync.py            # 35 hari terakhir
    python3 everpro-sync.py 60         # 60 hari terakhir
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

BASE = "https://customer.everpro.id"
WIB = timezone(timedelta(hours=7))
AKAR = os.path.dirname(os.path.abspath(__file__))
KELUARAN = os.path.join(AKAR, "data", "everpro.json")

STATUS_FIELD = [
    "waiting_for_pickup", "in_process", "pickup_failed", "in_process_return",
    "delivered", "lost_broken", "returned", "failed_delivery",
]


def baca_token():
    jalur = os.path.join(AKAR, ".env")
    if not os.path.exists(jalur):
        sys.exit("File .env tidak ada. Isi dengan: EVERPRO_TOKEN=Bearer eyJ...")
    for baris in open(jalur):
        if baris.startswith("EVERPRO_TOKEN="):
            tok = baris.split("=", 1)[1].strip()
            if not tok.lower().startswith("bearer"):
                tok = "Bearer " + tok
            return tok
    sys.exit("EVERPRO_TOKEN tidak ditemukan di .env")


def ambil(token, path):
    req = urllib.request.Request(
        BASE + path,
        headers={
            "Authorization": token,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 401:
            sys.exit("Token kedaluwarsa. Salin ulang dari DevTools lalu perbarui .env")
        raise


def epoch(tgl, akhir=False):
    jam = "23:59:59" if akhir else "00:00:00"
    d = datetime.strptime(f"{tgl} {jam}", "%Y-%m-%d %H:%M:%S").replace(tzinfo=WIB)
    return int(d.timestamp())


def satu_hari(token, tgl):
    a, b = epoch(tgl), epoch(tgl, True)
    st = ambil(token, f"/api/logistic/v1/public/shipment/performances/statuses?start_epoch={a}&end_epoch={b}")
    sm = ambil(token, f"/api/logistic/v1/public/shipment/performances/summary?start_epoch={a}&end_epoch={b}")
    S = st.get("data") or {}
    M = sm.get("data") or {}
    kirim = M.get("delivered") or {}
    retur = M.get("returned") or {}
    proses = M.get("in_process") or {}
    baris = {"date": tgl}
    for f in STATUS_FIELD:
        baris[f] = int(S.get(f) or 0)
    baris.update({
        "total_order": int(M.get("total_order") or 0),
        "shipment_price": float(M.get("shipment_price") or 0),
        "delivered_cod": int(kirim.get("cod") or 0),
        "delivered_non_cod": int(kirim.get("non_cod") or 0),
        "returned_total": int(retur.get("total") or 0),
        "in_process_total": int(proses.get("total") or 0),
        "on_process_cod": float(M.get("on_process_cod") or 0),
        "accumulated_balance": float(M.get("accumulated_balance") or 0),
    })
    return baris


def main():
    hari = int(sys.argv[1]) if len(sys.argv) > 1 else 35
    token = baca_token()
    ini = datetime.now(WIB).date()

    baris = []
    for i in range(hari - 1, -1, -1):
        tgl = (ini - timedelta(days=i)).isoformat()
        try:
            d = satu_hari(token, tgl)
        except Exception as e:
            print(f"  {tgl}: gagal ({e})")
            continue
        # lewati hari yang benar-benar kosong
        if d["total_order"] or any(d[f] for f in STATUS_FIELD):
            baris.append(d)
            print(f"  {tgl}: {d['total_order']} kiriman, {d['delivered']} terkirim")
        time.sleep(0.25)

    os.makedirs(os.path.dirname(KELUARAN), exist_ok=True)
    isi = {
        "updated_at": datetime.now(WIB).strftime("%Y-%m-%d %H:%M"),
        "timezone": "Asia/Jakarta",
        "hari": hari,
        "data": baris,
    }
    with open(KELUARAN, "w") as f:
        json.dump(isi, f, ensure_ascii=False, indent=1)
    print(f"\nTersimpan: {KELUARAN} ({len(baris)} hari berisi data)")


if __name__ == "__main__":
    main()
