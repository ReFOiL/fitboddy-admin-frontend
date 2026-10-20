FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Флаг вшивается на сборке Vite. По умолчанию уведомления выключены.
# Включить: docker build --build-arg VITE_NOTIFICATIONS_ENABLED=true --build-arg VITE_TELEGRAM_BOT_USERNAME=...
ARG VITE_NOTIFICATIONS_ENABLED=false
ARG VITE_TELEGRAM_BOT_USERNAME=
ENV VITE_NOTIFICATIONS_ENABLED=$VITE_NOTIFICATIONS_ENABLED
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME
RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache wget

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
