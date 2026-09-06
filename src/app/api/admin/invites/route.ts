import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { createInviteSchema } from '@/lib/schemas';
import { requireAdmin } from '@/lib/session';
import { errorResponse, parseBody } from '@/lib/api';

/** Listado de invitaciones. Nunca incluye el token: en la base solo vive su hash. */
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ invites: await StorageService.getInviteTokens() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await parseBody(request, createInviteSchema);

    const { token, invite } = await StorageService.createInviteToken({
      label: body.label,
      expiresInDays: body.expiresInDays,
    });

    // Única respuesta en toda la aplicación que contiene el token en claro. A partir de
    // aquí solo existe donde el administrador lo haya copiado.
    return NextResponse.json({ success: true, token, invite });
  } catch (err) {
    return errorResponse(err);
  }
}
