import 'server-only';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { AuthError } from './errors';

const COOKIE_NAME = 'uwu_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export type SessionType = 'ADMIN' | 'MEMBER';

export interface SessionPayload {
  type: SessionType;
  /** Solo presente en sesiones de miembro. */
  memberId?: string;
  characterName?: string;
}



function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    // Fallar aquí es preferible a firmar con una clave débil o previsible: una sesión
    // firmada con un secreto adivinable equivale a no tener sesión.
    throw new Error(
      'Falta SESSION_SECRET (mínimo 32 caracteres). Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"'
    );
  }

  return new TextEncoder().encode(secret);
}

/**
 * Firma la sesión y la deja en una cookie httpOnly.
 *
 * httpOnly es lo que impide que el JavaScript de la página lea o falsifique la sesión;
 * antes vivía en localStorage, donde bastaba escribir `{"type":"ADMIN"}` para tener
 * el panel de administración.
 */
export async function createSession(payload: SessionPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Lee y verifica la sesión. Devuelve null si no hay cookie, si la firma no cuadra
 * o si ya caducó.
 */
export async function verifySession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });

    if (payload.type !== 'ADMIN' && payload.type !== 'MEMBER') return null;

    return {
      type: payload.type,
      memberId: typeof payload.memberId === 'string' ? payload.memberId : undefined,
      characterName:
        typeof payload.characterName === 'string' ? payload.characterName : undefined,
    };
  } catch {
    // Firma inválida, token manipulado o caducado.
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** Exige sesión iniciada (miembro o admin). */
export async function requireSession(): Promise<SessionPayload> {
  const session = await verifySession();
  if (!session) throw new AuthError('Debes iniciar sesión.', 401);
  return session;
}

/** Exige una sesión de miembro con id (el admin no tiene personaje propio). */
export async function requireMember(): Promise<SessionPayload & { memberId: string }> {
  const session = await requireSession();

  if (session.type !== 'MEMBER' || !session.memberId) {
    throw new AuthError('Esta acción requiere una sesión de miembro.', 403);
  }

  return session as SessionPayload & { memberId: string };
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();

  if (session.type !== 'ADMIN') {
    throw new AuthError('Esta acción requiere permisos de administrador.', 403);
  }

  return session;
}

/**
 * Exige que quien llama sea el propio miembro o un administrador.
 * Devuelve la sesión para que el handler pueda distinguir ambos casos.
 */
export async function requireSelfOrAdmin(memberId: string): Promise<SessionPayload> {
  const session = await requireSession();

  if (session.type === 'ADMIN') return session;
  if (session.type === 'MEMBER' && session.memberId === memberId) return session;

  throw new AuthError('Solo puedes modificar tu propio perfil.', 403);
}
