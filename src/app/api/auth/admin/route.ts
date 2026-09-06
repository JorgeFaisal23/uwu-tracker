import { NextResponse } from 'next/server';
import { getAdminUsername, verifyAdminCredentials } from '@/lib/auth';
import { adminLoginSchema } from '@/lib/schemas';
import { createSession } from '@/lib/session';
import { RateLimitError, errorResponse, parseBody } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/**
 * Más estricto que el login de miembro (10 cada 5 min), y por dos razones distintas.
 *
 * La primera es que aquí solo hay una cuenta y su contraseña abre el panel entero: es el
 * único sitio donde acertar a base de intentos vale la pena. La segunda es el coste —
 * `verifyAdminCredentials` ejecuta bcrypt de 10 rondas en cada intento, acierte o falle,
 * y en una función serverless que escala sola eso es CPU facturable que cualquiera podía
 * quemar sin límite mandando peticiones.
 *
 * Un administrador legítimo no necesita cinco intentos en un cuarto de hora.
 */
const ADMIN_LOGIN_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

export async function POST(request: Request) {
  try {
    // Antes de leer el cuerpo y, sobre todo, antes del bcrypt.
    const intento = rateLimit(`auth:admin:${clientIp(request)}`, ADMIN_LOGIN_LIMIT);
    if (!intento.allowed) {
      throw new RateLimitError(
        'Demasiados intentos de acceso. Espera unos minutos e inténtalo de nuevo.',
        intento.retryAfterSeconds
      );
    }

    const { username, password } = await parseBody(request, adminLoginSchema);

    // Un único mensaje para usuario y contraseña incorrectos: distinguirlos revelaría
    // qué nombre de usuario es el bueno.
    if (!(await verifyAdminCredentials(username, password))) {
      return NextResponse.json(
        { error: 'Credenciales de administrador inválidas.' },
        { status: 401 }
      );
    }

    await createSession({ type: 'ADMIN', characterName: 'Administrador' });

    return NextResponse.json({
      success: true,
      session: { type: 'ADMIN', characterName: 'Administrador' },
      user: { username: getAdminUsername(), role: 'ADMIN' },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
