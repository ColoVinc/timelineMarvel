import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Three.js è caricato in un chunk separato (lazy): alziamo la soglia di
    // avviso perché quel chunk è volutamente grande e non blocca il primo paint.
    chunkSizeWarningLimit: 1200,
  },
});
