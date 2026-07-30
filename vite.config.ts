import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative assets loading on GitHub Pages
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
