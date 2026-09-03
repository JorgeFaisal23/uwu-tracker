import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { scanAllViableSlots } from '@/lib/party-matcher';
import { getNextDateForDayOfWeek } from '@/lib/date-utils';

export async function GET() {
  try {
    const members = StorageService.getMembers();
    const progressMap = StorageService.getProgressMap();
    const availabilities = StorageService.getAvailabilities();

    // Calcular todas las combinaciones viables en todos los horarios
    const viableSlotsMap = scanAllViableSlots(availabilities, members, progressMap);
    // Obtener las parties oficiales ya aceptadas (solo vigentes, no expiradas)
    const scheduledParties = StorageService.getScheduledParties(false);
    // Obtener el histórico de parties concluidas/pasadas
    const pastParties = StorageService.getPastParties();

    return NextResponse.json({
      viableSlotsMap,
      scheduledParties,
      pastParties,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al calcular parties';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      scheduledDate, 
      dayOfWeek, 
      hourSlot, 
      durationHours, 
      startTimeLabel, 
      notes, 
      members 
    } = body;

    if (dayOfWeek === undefined || hourSlot === undefined || !members || !Array.isArray(members)) {
      return NextResponse.json({ error: 'Datos de la party incompletos.' }, { status: 400 });
    }

    const dOfWeek = Number(dayOfWeek);
    const hSlot = Number(hourSlot);
    const targetDate = scheduledDate || getNextDateForDayOfWeek(dOfWeek, hSlot);

    // Inicializar a los miembros con estado PENDING para confirmación
    const membersFormatted = members.map((m: any) => ({
      memberId: m.memberId,
      characterName: m.characterName,
      assignedJob: m.assignedJob,
      assignedRole: m.assignedRole,
      isMainJob: Boolean(m.isMainJob),
      confirmationStatus: m.confirmationStatus || 'PENDING',
    }));

    const scheduled = StorageService.scheduleParty({
      scheduledDate: targetDate,
      dayOfWeek: dOfWeek,
      hourSlot: hSlot,
      durationHours: Number(durationHours || 1),
      startTimeLabel: startTimeLabel || `Día ${dOfWeek} a las ${hSlot}:00`,
      status: 'ACCEPTED',
      notes: notes || 'Incursión Oficial de Lux Obscura',
      members: membersFormatted,
    });

    return NextResponse.json({ success: true, party: scheduled });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al oficializar party';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de party requerido.' }, { status: 400 });
    }

    StorageService.cancelScheduledParty(id);
    return NextResponse.json({ success: true, message: 'Party cancelada.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al cancelar party';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
