import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src');

export default defineConfig({
  resolve: {
    alias: {
      '@': src,
      // `server-only` lanza nada más importarse fuera del grafo de servidor de Next, así
      // que cualquier módulo marcado con él sería intestable. Se sustituye por un módulo
      // vacío: la protección real la sigue aplicando el compilador de Next en el build.
      'server-only': path.join(src, 'lib/__tests__/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
