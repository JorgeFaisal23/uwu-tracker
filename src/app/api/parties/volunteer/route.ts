import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { volunteerPartySchema, removeVolunteerSchema } from '@/lib/schemas';
import { requireSession } from '@/lib/session';
import { errorResponse, parseBody } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const session = await requireSession();

    if (!session.memberId || !session.characterName) {
      return NextResponse.json(
        { error: 'Debes tener una sesión de miembro para ofrecerte como voluntario.' },
        { status: 403 }
      );
    }

    const body = await parseBody(request, volunteerPartySchema);

    const volunteer = await StorageService.registerVolunteer({
      partyScheduleId: body.partyScheduleId,
      slotKey: body.slotKey,
      memberId: session.memberId,
      characterName: session.characterName,
      assignedJob: body.assignedJob,
      assignedRole: body.assignedRole,
      availabilityNote: body.availabilityNote,
    });

    return NextResponse.json({
      success: true,
      volunteer,
      message: '¡Tu ofrecimiento de ayuda ha sido registrado!',
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();

    if (!session.memberId) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para retirar tu ofrecimiento.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const partyScheduleId = url.searchParams.get('partyScheduleId') || undefined;
    const slotKey = url.searchParams.get('slotKey') || undefined;

    const parsed = removeVolunteerSchema.parse({ partyScheduleId, slotKey });

    await StorageService.removeVolunteer({
      memberId: session.memberId,
      partyScheduleId: parsed.partyScheduleId,
      slotKey: parsed.slotKey,
    });

    return NextResponse.json({
      success: true,
      message: 'Ofrecimiento de ayuda retirado.',
    });
  } catch (err) {
    return errorResponse(err);
  }
}
