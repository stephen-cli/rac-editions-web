import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: { port: 5180 },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
