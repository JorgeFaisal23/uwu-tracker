import { NextResponse } from 'next/server';
import { DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_HASH, verifyPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña requeridos.' },
        { status: 400 }
      );
    }

    if (username.trim().toLowerCase() !== DEFAULT_ADMIN_USERNAME.toLowerCase()) {
      return NextResponse.json(
        { error: 'Credenciales de administrador inválidas.' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, DEFAULT_ADMIN_HASH);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Contraseña de administrador incorrecta.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        username: DEFAULT_ADMIN_USERNAME,
        role: 'ADMIN',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error en autenticación de admin';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
