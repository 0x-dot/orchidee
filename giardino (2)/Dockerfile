# --- 1. build frontend Angular (output in /app/web/dist/browser) ---
FROM node:22-alpine AS web
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# --- 2. build backend Go con il frontend incorporato ---
FROM golang:1.23-alpine AS build
WORKDIR /src
COPY . .
COPY --from=web /app/web/dist/browser ./web/dist/browser
RUN go mod tidy && CGO_ENABLED=0 go build -o /giardino .

# --- 3. immagine finale ---
FROM alpine:3.20
COPY --from=build /giardino /giardino
ENV DATA_DIR=/data ADDR=:8080 COOKIE_SECURE=1
VOLUME /data
EXPOSE 8080
CMD ["/giardino"]
