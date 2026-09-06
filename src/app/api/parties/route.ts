import { NextResponse, after } from 'next/server';
import { StorageService } from '@/lib/storage';
import { scanAllViableSlots, diagnoseAllNearMissSlots } from '@/lib/party-matcher';
import { getNextDateForDayOfWeek } from '@/lib/date-utils';
import { schedulePartySchema } from '@/lib/schemas';
import { requireAdmin, requireSession } from '@/lib/session';
import { errorResponse, parseBody } from '@/lib/api';
import { DAYS_OF_WEEK, formatHourOnly } from '@/lib/timezones';
import { notifyPartyScheduled, notifyPartyCancelled } from '@/lib/discord';

/**
 * Exige sesión por dos motivos. Expone el roster y los horarios, y además es con
 * diferencia la lectura más cara de la aplicación: `scanAllViableSlots` y
 * `diagnoseAllNearMissSlots` recorren la disponibilidad de toda la FC en cada llamada,
 * sin caché. Abierto era el mejor candidato para agotar la cuota de la función.
 */
export async function GET() {
  try {
    await requireSession();

    const [members, progressMap, availabilities, scheduledParties, pastParties, attendanceCounts] =
      await Promise.all([
        StorageService.getMembers(),
        StorageService.getProgressMap(),
        StorageService.getAvailabilities(),
        StorageService.getScheduledParties(false),
        StorageService.getPastParties(),
        StorageService.getAttendanceCounts(),
      ]);

    const viableSlotsMap = scanAllViableSlots(
      availabilities,
      members,
      progressMap,
      attendanceCounts
    );
    const nearMissSlots = diagnoseAllNearMissSlots(availabilities, members, progressMap);

    return NextResponse.json({ viableSlotsMap, scheduledParties, pastParties, nearMissSlots });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await parseBody(request, schedulePartySchema);

    const scheduled = await StorageService.scheduleParty({
      scheduledDate:
        body.scheduledDate || getNextDateForDayOfWeek(body.dayOfWeek, body.hourSlot),
      dayOfWeek: body.dayOfWeek,
      hourSlot: body.hourSlot,
      durationHours: body.durationHours,
      startTimeLabel: body.startTimeLabel || defaultTimeLabel(body.dayOfWeek, body.hourSlot),
      status: 'ACCEPTED',
      notes: body.notes || 'Incursión Oficial de Lux Obscura',
      members: body.members.map(m => ({ ...m, confirmationStatus: 'PENDING' as const })),
    });

    after(async () => {
      await notifyPartyScheduled(scheduled);
    });

    return NextResponse.json({ success: true, party: scheduled });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID de party requerido.' }, { status: 400 });
    }

    const party = await StorageService.getPartyById(id);

    await StorageService.cancelScheduledParty(id);

    if (party) {
      after(async () => {
        await notifyPartyCancelled(party);
      });
    }

    return NextResponse.json({ success: true, message: 'Party cancelada.' });
  } catch (err) {
    return errorResponse(err);
  }
}

function defaultTimeLabel(dayOfWeek: number, hourSlot: number): string {
  const day = DAYS_OF_WEEK.find(d => d.id === dayOfWeek);
  return `${day?.name ?? `Día ${dayOfWeek}`} ${formatHourOnly(hourSlot)}`;
}
