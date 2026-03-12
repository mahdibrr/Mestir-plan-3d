import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        scene: 'scene-3d.html',
        specs: 'specifications.html',
        diagram: 'technical-diagram.html'
      }
    }
  }
});
