import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { availabilitySchema } from '@/lib/schemas';
import { requireSession } from '@/lib/session';
import { errorResponse, parseBody } from '@/lib/api';

export async function GET() {
  try {
    const availabilities = await StorageService.getAvailabilities();
    return NextResponse.json({ availabilities });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request, availabilitySchema);

    // Igual que en progreso: el miembro solo edita su propia disponibilidad.
    const targetMemberId =
      session.type === 'ADMIN' ? (body.memberId ?? session.memberId) : session.memberId;

    if (!targetMemberId) {
      return NextResponse.json(
        { error: 'Indica el miembro cuya disponibilidad se va a actualizar.' },
        { status: 400 }
      );
    }

    await StorageService.setMemberAvailability(targetMemberId, body.slots);

    return NextResponse.json({
      success: true,
      message: 'Disponibilidad actualizada correctamente.',
    });
  } catch (err) {
    return errorResponse(err);
  }
}
