import { NextResponse } from 'next/server';
import { getAdminUsername, verifyAdminCredentials } from '@/lib/auth';
import { adminLoginSchema } from '@/lib/schemas';
import { createSession } from '@/lib/session';
import { errorResponse, parseBody } from '@/lib/api';

export async function POST(request: Request) {
  try {
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
