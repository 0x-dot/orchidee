#!/usr/bin/env bash
# Preparazione una tantum della VM (Ubuntu/Debian). Eseguire con sudo. È idempotente.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Esegui con: sudo bash setup-vm.sh"; exit 1; }

# 1 GB di swap: la e2-micro ha solo 1 GB di RAM
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

apt-get update
apt-get install -y ca-certificates curl sqlite3 rclone cron
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh

mkdir -p /opt/giardino/data

# backup notturno alle 03:30
cat > /etc/cron.d/giardino-backup <<'CRON'
30 3 * * * root /opt/giardino/backup.sh >> /var/log/giardino-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/giardino-backup

touch /opt/giardino/.setup_done
echo "VM pronta."
