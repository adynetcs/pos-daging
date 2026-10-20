import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Pengembangan lokal: `npm run dev` tidak menjalankan fungsi /api.
 * Isi DEV_API_TARGET di .env.local (mis. https://pos-daging-xxx.vercel.app) agar /api
 * diteruskan ke deployment Vercel. PERHATIAN: data yang diubah saat dev = data asli di Sheets.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.DEV_API_TARGET;
  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: target
      ? {
          proxy: {
            '/api': {
              target, changeOrigin: true, secure: true,
              configure: (proxy) => {
                // Samakan header Origin dengan target agar lolos pemeriksaan asal permintaan di server
                proxy.on('proxyReq', (req) => req.setHeader('origin', target));
                // Cookie sesi bertanda Secure tetap diterima browser di http://localhost
              },
            },
          },
        }
      : undefined,
  };
});
