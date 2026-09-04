#!/usr/bin/env node
/**
 * Genera el valor de ADMIN_PASSWORD_HASH a partir de una contraseña.
 *
 * Uso: node scripts/hash-password.mjs "mi-contraseña"
 */
import bcrypt from 'bcryptjs';

const plain = process.argv[2];

if (!plain) {
  console.error('Uso: node scripts/hash-password.mjs "<contraseña>"');
  process.exit(1);
}

const hash = await bcrypt.hash(plain, 10);
const base64 = Buffer.from(hash, 'utf8').toString('base64');

console.log('\nPara un archivo .env.local (recomendado):');
console.log(`  ADMIN_PASSWORD_HASH=${base64}`);
console.log('\nPara un panel de variables de entorno (Vercel y similares):');
console.log(`  ${hash}`);
console.log(
  '\nLas dos formas son equivalentes. En un archivo .env el hash literal se corrompe,\n' +
    'porque el cargador interpreta cada "$" como una variable a sustituir.\n'
);
