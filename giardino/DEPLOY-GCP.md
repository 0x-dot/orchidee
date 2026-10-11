# Deploy su Google Cloud (VM e2-micro gratuita)

Architettura: una VM con Docker che esegue l'app (un solo container) e Caddy davanti, che gestisce HTTPS da solo.
Database e foto stanno sul disco persistente della VM (`/opt/giardino/data`). Backup notturno su Google Drive.

## Cosa ti serve
- Un account Google con una carta valida (per l'account di fatturazione; l'uso resta nei limiti gratuiti)
- Sul tuo computer: **Docker** e **Google Cloud CLI** (`gcloud`). Gli script sono bash: su Windows usa WSL.

## 1. Account, progetto e avviso di budget
1. Vai su console.cloud.google.com e crea un **progetto** (es. `giardino`) con un account di fatturazione.
2. **Fatturazione → Budget e avvisi → Crea budget**: importo 1 €, avvisi al 50% e al 100%.
   Se qualcosa esce dai limiti gratuiti lo saprai subito.
3. Abilita l'API: **Compute Engine API**.
4. Sul computer: `gcloud auth login` e `gcloud config set project ID_DEL_PROGETTO`.

## 2. Crea la VM (le impostazioni contano!)
**Compute Engine → Istanze VM → Crea istanza**

| Campo | Valore |
|---|---|
| Nome | `giardino` |
| Regione / zona | `us-central1` / `us-central1-a` (oppure us-west1 o us-east1) |
| Tipo di macchina | **e2-micro** (serie E2) |
| Disco di avvio | **Disco permanente standard**, **30 GB**, Ubuntu 24.04 LTS |
| Firewall | spunta **Consenti traffico HTTP** e **HTTPS** |
| Rete → Livello di servizio di rete | **Standard** |
| Osservabilità / Ops Agent | **disattivato** (consuma RAM) |

Solo queste regioni, questo tipo di macchina e fino a 30 GB di disco standard rientrano nell'offerta gratuita.
Il riepilogo di costo mostrato in fase di creazione può indicare una cifra mensile anche se poi ricadi nella quota gratuita:
la verifica vera si fa al punto 8.

## 3. Indirizzo IP fisso
Nella pagina della VM → **Interfacce di rete** → IP esterno → **Riserva indirizzo IP statico**.
Così l'IP non cambia se riavvii la VM. Annota l'IP. Non lasciare mai un IP statico riservato e non collegato a una VM.

## 4. Un nome di dominio gratuito (DuckDNS)
1. Su duckdns.org accedi e crea un sottodominio, es. `giardino-tuonome` → `giardino-tuonome.duckdns.org`.
2. Nel campo "current ip" scrivi l'IP della VM e premi *update*.
3. Controlla con `ping giardino-tuonome.duckdns.org`: deve rispondere con quell'IP.
   (Con un dominio tuo basta un record A verso l'IP.)

## 5. Primo deploy
Dalla cartella `giardino` sul tuo computer:
```
DOMAIN=giardino-tuonome.duckdns.org bash deploy/deploy.sh
```
Lo script copia i file sulla VM, installa Docker, swap e backup, costruisce l'immagine sul tuo computer,
la invia alla VM e avvia tutto. Se usi un Mac con chip Apple va bene lo stesso: l'immagine viene costruita per `linux/amd64`.
Se la VM o la zona hanno nomi diversi: `VM=nome ZONE=zona bash deploy/deploy.sh`.

Apri **https://giardino-tuonome.duckdns.org**. Il certificato viene emesso al primo accesso, può servire qualche secondo.
Non funziona? Dalla VM: `cd /opt/giardino && sudo docker compose logs --tail 50`.
Cause tipiche: DNS non ancora aggiornato, oppure porte 80/443 non aperte nel firewall.

## 6. Aggiornare l'app
Dopo ogni modifica al codice: `bash deploy/deploy.sh`. I dati restano in `/opt/giardino/data`.

## 7. Backup su Google Drive
Il backup gira ogni notte alle 03:30 (cron). Va configurato una volta, perché serve il tuo permesso su Drive.
1. Sul **tuo computer** installa rclone (rclone.org) ed esegui `rclone authorize "drive"`. Si apre il browser: accedi e consenti.
   Il terminale stampa un blocco di testo con il token.
2. Sulla VM: `gcloud compute ssh giardino --zone us-central1-a`, poi `sudo rclone config`:
   - `n` (new remote), nome **gdrive**, tipo **drive**
   - client id e secret: lasciali vuoti; scope: `1` (accesso completo) o `3` (solo file creati da rclone: più sicuro)
   - alla domanda "Use web browser to automatically authenticate?" rispondi **n**, poi incolla il token del punto 1
3. Prova: `sudo /opt/giardino/backup.sh`. Su Drive compare la cartella `giardino-backup` con `db/` e `photos/`.

Le foto vengono solo aggiunte, mai cancellate dal backup. Del database si conservano gli ultimi 14 giorni.
Attenzione: se la tua app Google OAuth è in modalità "test", il token può scadere dopo pochi giorni. Se i backup falliscono con
un errore di autorizzazione, ripeti `rclone authorize`. Il log è in `/var/log/giardino-backup.log`.

### Ripristino
```
sudo docker compose -f /opt/giardino/docker-compose.yml stop giardino
sudo rclone copyto gdrive:giardino-backup/db/garden-AAAA-MM-GG.db.gz /tmp/g.db.gz
sudo gunzip -f /tmp/g.db.gz && sudo mv /tmp/g.db /opt/giardino/data/garden.db
sudo rm -f /opt/giardino/data/garden.db-wal /opt/giardino/data/garden.db-shm
sudo rclone copy gdrive:giardino-backup/photos /opt/giardino/data/photos
sudo docker compose -f /opt/giardino/docker-compose.yml start giardino
```

## 8. Controlla che sia davvero gratis
Dopo 2–3 giorni: **Fatturazione → Report**, raggruppa per SKU. Cosa guardare:
- le righe dell'**indirizzo IP esterno**: la documentazione dell'offerta gratuita dice che non viene addebitato,
  ma la pagina dei prezzi di rete elenca circa 0,005 $/ora per gli IP in uso. Se compare un costo, sono circa 3–4 $ al mese.
- il **traffico in uscita**: la quota gratuita è 1 GB al mese dal Nord America. Oltre si paga qualche centesimo per GB.
- snapshot o dischi extra: non sono gratuiti, evita di crearli.
Se il costo non ti sta bene, spegni tutto: elimina la VM e l'IP riservato.

## Comandi utili (sulla VM)
```
cd /opt/giardino
sudo docker compose ps
sudo docker compose logs -f giardino
sudo docker compose restart
df -h /            # spazio disco
```
