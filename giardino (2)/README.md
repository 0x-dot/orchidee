# Giardino digitale

Go + SQLite (backend) · Angular (frontend, incorporato nel binario con go:embed).

## Sviluppo
    go run .                      # API + frontend già compilato su :8080
    cd frontend && npm install
    npm start                     # ng serve su :4200 con proxy /api -> :8080

## Build frontend nel binario
    cd frontend && npm run build  # scrive in ../web/dist/browser
    cd .. && go run .

## Docker
    docker build -t giardino .
    docker run -p 8080:8080 -v giardino-data:/data -e COOKIE_SECURE=0 giardino
(`COOKIE_SECURE=1` solo dietro HTTPS.)

## Dati
`DATA_DIR` (default `./data`) contiene `garden.db` e la cartella `photos/`. Con Docker, monta un volume su `/data`.
Le foto vengono ridimensionate (lato lungo max 1600 px) e ricodificate in JPEG: i metadati EXIF, GPS compreso, non vengono conservati.

## Due container (frontend nginx + API Go)
    docker compose up --build        # poi http://localhost:8080
nginx serve Angular e inoltra `/api` al container `api`: il browser vede una sola origine, quindi i cookie di sessione funzionano senza CORS.
Per un solo container (più semplice sui piani gratuiti) usa il `Dockerfile` nella radice.

## Deploy online
Vedi `DEPLOY-GCP.md`: VM gratuita Google Cloud e2-micro, HTTPS automatico con Caddy, backup notturno su Google Drive.

## Lingue e traduzioni
Tutti i testi dell'interfaccia stanno in `frontend/src/i18n/traduzioni.csv` (colonne `key,it,en`). Si modifica con Excel o LibreOffice
(anche salvato con `;` e BOM) e si ricostruisce con `npm run build` o `npm start`: lo script `scripts/build-i18n.mjs` genera il file usato dall'app
e si ferma con un errore chiaro se manca una traduzione, se i segnaposto `{nome}` non coincidono o se nel codice si usa una chiave inesistente.
- Nel template: `{{ 'chiave' | t }}` oppure con parametri `{{ 'chiave' | t:{ name: x } }}`.
- Per aggiungere una lingua: una nuova colonna nel CSV, il tipo `Lang` in `src/app/i18n.ts` e un pulsante nell'intestazione.
- Il server non invia frasi ma codici di errore (`bad_credentials`...): le loro traduzioni sono le chiavi `err.*`.
- Le schede di esempio (`/api/seed?lang=it|en`) sono in `seed.go`. Gli indirizzi (`/esplora`, `/piante/…`) restano uguali nelle due lingue, così i QR già stampati continuano a funzionare.
