import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['nucleo/**/*.test.ts', 'integraciones/**/*.test.ts', 'logica_negocio/**/*.test.ts'],
  },
});
