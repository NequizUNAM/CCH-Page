import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: 'www',
  publicDir: '.',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'www/index.html'),
        'google-auth': resolve(projectRoot, 'src/google-auth-entry.js')
      },
      output: {
        entryFileNames: 'assets/[name].js'
      }
    }
  }
});
