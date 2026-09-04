import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Credenciales del panel de administración.
 *
 * Salen del entorno, no del código: antes el hash se calculaba en cada arranque a
 * partir de una contraseña literal que además estaba publicada en el README, de modo
 * que rotarla exigía tocar el código y cualquiera que viera el repositorio la conocía.
 */
export function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME || 'admin';
}

/**
 * Hash bcrypt del administrador.
 *
 * Se acepta en dos formas porque un hash bcrypt empieza por `$2b$10$` y el cargador de
 * archivos `.env` de Next interpreta cada `$` como una variable a sustituir, dejando el
 * valor truncado (comillas incluidas). En un panel como el de Vercel eso no ocurre y el
 * hash literal funciona; en local conviene la variante en base64, que no contiene `$`.
 * `scripts/hash-password.mjs` imprime las dos.
 */
export function getAdminPasswordHash(): string {
  const raw = process.env.ADMIN_PASSWORD_HASH?.trim();

  if (!raw) {
    throw new Error(
      'Falta ADMIN_PASSWORD_HASH. Genera el valor con: node scripts/hash-password.mjs "<contraseña>"'
    );
  }

  if (isBcryptHash(raw)) return raw;

  const decoded = Buffer.from(raw, 'base64').toString('utf8');
  if (isBcryptHash(decoded)) return decoded;

  throw new Error(
    'ADMIN_PASSWORD_HASH no es un hash bcrypt válido. Si lo pegaste literal en un archivo .env, ' +
      'los "$" se pierden al cargarlo: usa la variante en base64 que imprime scripts/hash-password.mjs.'
  );
}

/** Un hash bcrypt son 60 caracteres y empieza por $2a$, $2b$ o $2y$. */
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(value);
}

/**
 * Verifica las credenciales de administrador.
 *
 * Se comprueba siempre el hash, incluso con un usuario incorrecto, para que el tiempo
 * de respuesta no revele si el nombre de usuario existe.
 */
export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const expectedHash = getAdminPasswordHash();
  const passwordMatches = await verifyPassword(password, expectedHash);
  const usernameMatches =
    username.trim().toLowerCase() === getAdminUsername().toLowerCase();

  return usernameMatches && passwordMatches;
}
