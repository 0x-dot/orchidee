#!/usr/bin/env bash
# Backup su Google Drive con rclone. Il database viene copiato con il comando
# .backup di SQLite (sicuro anche con l'app in funzione). Le foto non cambiano
# mai una volta salvate, quindi basta una copia incrementale.
set -euo pipefail
DATA=/opt/giardino/data
REMOTE="${RCLONE_REMOTE:-gdrive:giardino-backup}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

[ -f "$DATA/garden.db" ] || { echo "nessun database da salvare"; exit 0; }

sqlite3 "$DATA/garden.db" ".backup '$TMP/garden.db'"
gzip -9 "$TMP/garden.db"
rclone copyto "$TMP/garden.db.gz" "$REMOTE/db/garden-$(date +%F).db.gz"

# foto: copia solo quelle nuove, non cancella nulla sul Drive
if [ -d "$DATA/photos" ]; then
  rclone copy "$DATA/photos" "$REMOTE/photos" --ignore-existing
fi

# tieni gli ultimi 14 giorni di dump del database
rclone delete "$REMOTE/db" --min-age 14d
echo "$(date -Is) backup ok"
