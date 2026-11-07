import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { installerBridge } from './vite/installerBridge.ts';

/**
 * The installer the dev bridge runs: RAC_INSTALLER as a JSON array (program, then arguments), or else the
 * installer core from rac-editions checked out beside this repository (installer/core/build, built with
 * CMake), serving the Executive Edition's payload (tools/release.py's build/payload) and keeping its disc
 * hashes in build/installer-data, as the edition's tools/install.py does.
 */
function installerCommand(): string[] {
  if (process.env.RAC_INSTALLER) return JSON.parse(process.env.RAC_INSTALLER) as string[];
  const editions = new URL('../../../rac-editions/', import.meta.url);
  const program = process.platform === 'win32' ? 'rac-installer.exe' : 'rac-installer';
  return [
    fileURLToPath(new URL(`installer/core/build/${program}`, editions)),
    '--serve',
    '--payload',
    fileURLToPath(new URL('editions/rac1-executive/build/payload', editions)),
    '--data',
    fileURLToPath(new URL('editions/rac1-executive/build/installer-data', editions)),
  ];
}

export default defineConfig({
  plugins: [vue(), installerBridge({ command: installerCommand() })],
  server: { port: 5180 },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
