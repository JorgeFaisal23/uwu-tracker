import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

// Credenciales por defecto para el panel de administración
export const DEFAULT_ADMIN_USERNAME = 'admin';
// Hash pre-calculado para 'luxobscura2026'
export const DEFAULT_ADMIN_HASH = bcrypt.hashSync('luxobscura2026', 10);
