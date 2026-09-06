import 'server-only';

import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';

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
 * Alfabeto de los tokens de invitación.
 *
 * Sin I, L, O, 0 ni 1: el token se comparte por Discord y a veces se teclea a mano, y
 * esos caracteres se confunden entre sí al leerlos. Son 31 símbolos, así que cada uno
 * aporta algo menos de 5 bits.
 */
const ALFABETO_TOKEN = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LONGITUD_TOKEN = 20;

/**
 * Genera un token de invitación nuevo, con el formato XXXXX-XXXXX-XXXXX-XXXXX.
 *
 * 20 caracteres sobre 31 símbolos son unos 99 bits de entropía: adivinarlo es inviable
 * incluso sin el límite de peticiones. Se usa `randomBytes`, no `Math.random`, que es
 * predecible y nunca debe generar secretos.
 *
 * El rechazo de los bytes que caen fuera del último múltiplo completo del alfabeto evita
 * el sesgo del módulo, que haría más probables las primeras letras.
 */
export function generateInviteToken(): string {
  const limite = 256 - (256 % ALFABETO_TOKEN.length);
  let salida = '';

  while (salida.length < LONGITUD_TOKEN) {
    for (const byte of randomBytes(LONGITUD_TOKEN)) {
      if (byte >= limite) continue;
      salida += ALFABETO_TOKEN[byte % ALFABETO_TOKEN.length];
      if (salida.length === LONGITUD_TOKEN) break;
    }
  }

  return (salida.match(/.{1,5}/g) ?? []).join('-');
}

/**
 * Lleva un token a su forma canónica: mayúsculas y sin separadores.
 *
 * Así da igual que quien se registra lo pegue con guiones, sin ellos, en minúsculas o
 * con un espacio de más al copiarlo de Discord.
 */
export function normalizeInviteToken(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Hash del token, que es lo único que se guarda en la base.
 *
 * SHA-256 sin sal es suficiente aquí, al contrario que para una contraseña: el token lo
 * genera el servidor con ~99 bits de aleatoriedad, así que no hay diccionario ni tabla
 * precalculada que valga. bcrypt solo añadiría latencia.
 */
export function hashInviteToken(raw: string): string {
  return createHash('sha256').update(normalizeInviteToken(raw)).digest('hex');
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
