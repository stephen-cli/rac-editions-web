import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { installerBridge } from './vite/installerBridge.ts';

// The installer the dev bridge runs: RAC_INSTALLER as a JSON array (program, then arguments), or else
// rac-editions' reference installer, checked out beside this repository.
const installer: string[] = process.env.RAC_INSTALLER
  ? (JSON.parse(process.env.RAC_INSTALLER) as string[])
  : [
      'python',
      fileURLToPath(new URL('../../../rac-editions/editions/rac1-executive/tools/install.py', import.meta.url)),
      '--serve',
    ];

export default defineConfig({
  plugins: [vue(), installerBridge({ command: installer })],
  server: { port: 5180 },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
