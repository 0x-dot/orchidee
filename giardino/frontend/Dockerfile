# Frontend Angular servito da nginx, con proxy di /api verso il container "api".
FROM node:22-alpine AS build
WORKDIR /app/frontend
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build          # scrive in ../web/dist/browser = /app/web/dist/browser

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist/browser /usr/share/nginx/html
EXPOSE 80
