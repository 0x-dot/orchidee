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
