# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build static assets ----------
FROM node:20-alpine AS builder
WORKDIR /app

# คัดลอก manifest ก่อน — ใช้ docker cache ของ npm ci ได้
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# build args → Vite จะอ่าน VITE_* ตอน build เท่านั้น (frame-time, ไม่ใช่ runtime)
ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_LINE_CHANNEL_ID
ARG VITE_LINE_REDIRECT_URI=http://localhost:5173/callback
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_LINE_CHANNEL_ID=$VITE_LINE_CHANNEL_ID
ENV VITE_LINE_REDIRECT_URI=$VITE_LINE_REDIRECT_URI

COPY . .
RUN npm run build

# ---------- Stage 2: serve via nginx (SPA fallback) ----------
FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA: route ทั้งหมดที่ไม่ใช่ static file ให้คืน index.html
RUN printf 'server {\n\
  listen 80;\n\
  server_name _;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
\n\
  # cache static assets นาน ๆ\n\
  location ~* \\.(?:js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$ {\n\
    expires 7d;\n\
    add_header Cache-Control "public, immutable";\n\
    try_files $uri =404;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
