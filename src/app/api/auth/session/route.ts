import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { errorResponse } from '@/lib/api';

/**
 * Sesión vigente según la cookie firmada.
 *
 * El cliente ya no guarda su propia copia de la sesión: la pide aquí, de modo que
 * escribir en localStorage no otorga ningún permiso.
 */
export async function GET() {
  try {
    const session = await verifySession();

    return NextResponse.json({
      session: session ?? { type: 'GUEST' },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
