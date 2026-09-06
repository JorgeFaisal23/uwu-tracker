import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { promoteSlotSchema, closePromoteSlotSchema } from '@/lib/schemas';
import { requireAdmin } from '@/lib/session';
import { errorResponse, parseBody } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await parseBody(request, promoteSlotSchema);

    const recruitment = await StorageService.promoteSlotRecruitment({
      slotKey: body.slotKey,
      dayOfWeek: body.dayOfWeek,
      hourSlot: body.hourSlot,
      notes: body.notes,
      missingSlots: body.missingSlots,
      createdBy: session.characterName || 'Admin',
    });

    return NextResponse.json({
      success: true,
      recruitment,
      message: '¡Convocatoria abierta para completar esta franja!',
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();

    const url = new URL(request.url);
    const slotKey = url.searchParams.get('slotKey');

    const parsed = closePromoteSlotSchema.parse({ slotKey });

    await StorageService.closePromotedRecruitment(parsed.slotKey);

    return NextResponse.json({
      success: true,
      message: 'Convocatoria cerrada.',
    });
  } catch (err) {
    return errorResponse(err);
  }
}
