import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { ConfirmationStatus } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partyId, memberId, status, isAdminOverride } = body;

    if (!partyId || !memberId || !status) {
      return NextResponse.json(
        { error: 'Parámetros incompletos (partyId, memberId y status requeridos).' },
        { status: 400 }
      );
    }

    if (!['CONFIRMED', 'DECLINED', 'PENDING'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado de confirmación no válido.' },
        { status: 400 }
      );
    }

    const result = StorageService.confirmPartyAttendance(
      partyId,
      memberId,
      status as ConfirmationStatus,
      Boolean(isAdminOverride)
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
      message: status === 'CONFIRMED' ? '¡Asistencia confirmada con éxito!' : 'Asistencia declinada.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al registrar confirmación';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
