import { defineConfig } from 'vite';

// base './': der Build funktioniert unter jedem Pfad (GitHub Pages, Artifact, lokal)
export default defineConfig({
  base: './',
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
