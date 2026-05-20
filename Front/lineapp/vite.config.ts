import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    host: true,            // ฟัง 0.0.0.0 → เปิดให้เข้าถึงจากนอก container ได้
    port: 5173,
    strictPort: true,
    watch: {
      // bind mount บน Windows/macOS host ไม่ส่ง inotify event ตามจริง — ต้อง poll
      usePolling: true,
      interval: 300,
    },
  },
})
