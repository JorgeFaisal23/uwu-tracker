import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignJWT } from 'jose';

/**
 * `verifySession` con una baja lógica de por medio.
 *
 * Es la parte que no se puede comprobar desde fuera por HTTP sin credenciales reales, y
 * justamente la que falla en silencio si se rompe: una firma válida seguiría pareciendo
 * una sesión buena.
 */

const SECRET = 'x'.repeat(40);
process.env.SESSION_SECRET = SECRET;

const cookieValue = vi.fn<() => string | undefined>(() => undefined);
const isMemberActive = vi.fn<(id: string) => Promise<boolean>>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'uwu_session' && cookieValue() ? { value: cookieValue() } : undefined,
  }),
}));

vi.mock('../storage', () => ({
  StorageService: {
    isMemberActive: (id: string) => isMemberActive(id),
  },
}));

const { verifySession } = await import('../session');

async function firmar(payload: Record<string, unknown>, secret = SECRET): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + 60_000))
    .sign(new TextEncoder().encode(secret));
}

describe('verifySession', () => {
  beforeEach(() => {
    cookieValue.mockReturnValue(undefined);
    isMemberActive.mockReset();
  });

  it('devuelve null sin cookie, sin consultar la base', async () => {
    expect(await verifySession()).toBeNull();
    expect(isMemberActive).not.toHaveBeenCalled();
  });

  it('acepta la sesión de un miembro que sigue de alta', async () => {
    isMemberActive.mockResolvedValue(true);
    cookieValue.mockReturnValue(
      await firmar({ type: 'MEMBER', memberId: 'm-1', characterName: 'Eros' })
    );

    expect(await verifySession()).toEqual({
      type: 'MEMBER',
      memberId: 'm-1',
      characterName: 'Eros',
    });
    expect(isMemberActive).toHaveBeenCalledWith('m-1');
  });

  /** El caso que motiva todo esto: la cookie es auténtica, pero la persona ya no está. */
  it('rechaza la sesión de un miembro dado de baja aunque la firma sea válida', async () => {
    isMemberActive.mockResolvedValue(false);
    cookieValue.mockReturnValue(
      await firmar({ type: 'MEMBER', memberId: 'm-2', characterName: 'Spam' })
    );

    expect(await verifySession()).toBeNull();
  });

  it('rechaza una sesión de miembro sin memberId', async () => {
    cookieValue.mockReturnValue(await firmar({ type: 'MEMBER' }));

    expect(await verifySession()).toBeNull();
    expect(isMemberActive).not.toHaveBeenCalled();
  });

  /** El administrador no es una fila de `members`, así que no hay alta que consultar. */
  it('acepta al administrador sin consultar la tabla de miembros', async () => {
    cookieValue.mockReturnValue(
      await firmar({ type: 'ADMIN', characterName: 'Administrador' })
    );

    expect(await verifySession()).toMatchObject({ type: 'ADMIN' });
    expect(isMemberActive).not.toHaveBeenCalled();
  });

  it('rechaza un token firmado con otro secreto', async () => {
    cookieValue.mockReturnValue(
      await firmar({ type: 'MEMBER', memberId: 'm-3' }, 'y'.repeat(40))
    );

    expect(await verifySession()).toBeNull();
    expect(isMemberActive).not.toHaveBeenCalled();
  });

  /** Si la consulta del alta falla se responde "sin sesión", no "adelante". */
  it('devuelve null si no se puede comprobar el alta', async () => {
    isMemberActive.mockRejectedValue(new Error('base caída'));
    cookieValue.mockReturnValue(await firmar({ type: 'MEMBER', memberId: 'm-4' }));

    expect(await verifySession()).toBeNull();
  });
});
