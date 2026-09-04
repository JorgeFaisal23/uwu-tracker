import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { confirmAttendanceSchema } from '@/lib/schemas';
import { requireSession } from '@/lib/session';
import { errorResponse, parseBody } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request, confirmAttendanceSchema);

    const isAdmin = session.type === 'ADMIN';

    // El override de la ventana de 5 h se deriva del tipo de sesión. Antes llegaba como
    // `isAdminOverride` en el cuerpo, así que cualquier miembro podía saltarse el plazo.
    const targetMemberId = isAdmin ? (body.memberId ?? session.memberId) : session.memberId;

    if (!targetMemberId) {
      return NextResponse.json(
        { error: 'Indica el miembro cuya asistencia se va a registrar.' },
        { status: 400 }
      );
    }

    const result = await StorageService.confirmPartyAttendance(
      body.partyId,
      targetMemberId,
      body.status,
      isAdmin
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'No fue posible registrar la confirmación.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      party: result.party,
      message:
        body.status === 'CONFIRMED'
          ? '¡Asistencia confirmada con éxito!'
          : 'Asistencia actualizada.',
    });
  } catch (err) {
    return errorResponse(err);
  }
}
