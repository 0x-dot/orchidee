#!/usr/bin/env bash
# Da lanciare sul TUO computer (Linux, Mac o WSL su Windows).
# Richiede: docker, gcloud (Google Cloud CLI).
#   Prima volta:  DOMAIN=giardino.duckdns.org bash deploy/deploy.sh
#   Aggiornamenti: bash deploy/deploy.sh
set -euo pipefail
VM="${VM:-giardino}"
ZONE="${ZONE:-us-central1-a}"
cd "$(dirname "$0")/.."

ssh_vm() { gcloud compute ssh "$VM" --zone "$ZONE" --command "$1"; }

echo "→ Copio i file di configurazione sulla VM…"
gcloud compute scp --zone "$ZONE" \
  deploy/docker-compose.prod.yml deploy/Caddyfile deploy/backup.sh deploy/setup-vm.sh "$VM":/tmp/

if ! ssh_vm "test -f /opt/giardino/.setup_done" 2>/dev/null; then
  echo "→ Prima configurazione della VM (swap, Docker, backup)…"
  ssh_vm "sudo bash /tmp/setup-vm.sh"
fi

ssh_vm "sudo install -m 644 /tmp/docker-compose.prod.yml /opt/giardino/docker-compose.yml \
 && sudo install -m 644 /tmp/Caddyfile /opt/giardino/Caddyfile \
 && sudo install -m 755 /tmp/backup.sh /opt/giardino/backup.sh"

if [ -n "${DOMAIN:-}" ]; then
  ssh_vm "echo 'DOMAIN=$DOMAIN' | sudo tee /opt/giardino/.env >/dev/null"
fi

echo "→ Costruisco l'immagine (linux/amd64)… la prima volta richiede alcuni minuti"
docker build --platform linux/amd64 -t giardino:latest .

echo "→ Invio l'immagine alla VM…"
docker save giardino:latest | gzip | gcloud compute ssh "$VM" --zone "$ZONE" --command "gunzip | sudo docker load"

echo "→ Avvio…"
ssh_vm "cd /opt/giardino && sudo docker compose up -d && sudo docker image prune -f >/dev/null"
echo "Fatto. Controlla: https://\${DOMAIN:-il-tuo-dominio}"
