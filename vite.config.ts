import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    watch: {
      useFsEvents: false,
      usePolling: true,
    },
  },
});
