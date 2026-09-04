import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { progressUpdateSchema } from '@/lib/schemas';
import { requireSession } from '@/lib/session';
import { errorResponse, parseBody } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request, progressUpdateSchema);

    // El miembro solo puede escribir su propio progreso: el memberId sale de la cookie
    // firmada, no del cuerpo. Solo el admin puede apuntar a otro miembro.
    const targetMemberId =
      session.type === 'ADMIN' ? (body.memberId ?? session.memberId) : session.memberId;

    if (!targetMemberId) {
      return NextResponse.json(
        { error: 'Indica el miembro cuyo progreso se va a actualizar.' },
        { status: 400 }
      );
    }

    const updated = await StorageService.updateProgress(
      targetMemberId,
      body.p1GarudaPct,
      body.p2IfritPct,
      body.p3TitanPct,
      body.p4UltimaPct,
      body.p5RoulettePct
    );

    return NextResponse.json({ success: true, progress: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
