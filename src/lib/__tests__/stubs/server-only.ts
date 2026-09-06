/**
 * Sustituto de `server-only` para los tests.
 *
 * El paquete real lanza en cuanto se importa fuera del grafo de servidor de Next, de
 * modo que ningún módulo marcado con él podría probarse. Aquí no hace nada: la garantía
 * de que esos módulos no acaban en el bundle del navegador la sigue dando el compilador
 * de Next durante el build, que es donde importa.
 *
 * Se conecta desde el alias `resolve.alias` de `vitest.config.mts`.
 */
export {};
