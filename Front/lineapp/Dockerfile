# syntax=docker/dockerfile:1.7

# =====================================================================
# Multi-stage Dockerfile — สลับ stage ได้จาก docker-compose `target:`
#   - dev      → Vite dev server + HMR (bind mount source code)
#   - builder  → build static assets ด้วย Vite
#   - runner   → nginx serve build (production)
# =====================================================================

# ---------- Stage: dev (Vite HMR + polling สำหรับ Windows bind mount) ----------
FROM node:20-alpine AS dev
WORKDIR /app

# install dependency ก่อน — layer นี้จะถูก cache จนกว่า package.json/lock จะเปลี่ยน
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# source code จะ bind-mount มาจาก host ตอน runtime (ไม่ COPY ใน dev stage)
EXPOSE 5173

# บังคับใช้ polling — bind mount บน Windows/macOS host ไม่ส่ง inotify event ตามจริง
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]


# ---------- Stage: builder (production build) ----------
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

# ---------- Stage: runtime (production static server without nginx) ----------
FROM node:20-alpine AS runtime
WORKDIR /app

RUN npm install -g serve@14.2.4 --no-audit --no-fund

COPY --from=builder /app/dist ./dist

EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
