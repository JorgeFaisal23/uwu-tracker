import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { requireSession } from '@/lib/session';
import { generatePartyIcs } from '@/lib/ics';
import { errorResponse, ApiError } from '@/lib/api';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const party = await StorageService.getPartyById(id);
    if (!party) {
      throw new ApiError('Incursión no encontrada.', 404);
    }

    const icsContent = generatePartyIcs(party);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="incursion-uwu-${party.scheduledDate}.ics"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
