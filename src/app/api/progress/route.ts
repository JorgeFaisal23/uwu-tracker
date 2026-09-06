import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { progressModeUpdateSchema, progressUpdateSchema, subroleSchema } from '@/lib/schemas';
import { requireSession } from '@/lib/session';
import { errorResponse, parseBody } from '@/lib/api';
import type { SessionPayload } from '@/lib/session';

/**
 * A quién apunta la petición.
 *
 * El miembro solo puede escribir su propio progreso: el id sale de la cookie firmada,
 * no del cuerpo. Solo el admin puede apuntar a otro miembro.
 */
function resolveTargetMemberId(
  session: SessionPayload,
  requestedMemberId?: string
): string | null {
  const target =
    session.type === 'ADMIN' ? (requestedMemberId ?? session.memberId) : session.memberId;

  return target ?? null;
}

const NO_TARGET = NextResponse.json(
  { error: 'Indica el miembro cuyo progreso se va a actualizar.' },
  { status: 400 }
);

/** Guarda las 5 fases: del rol indicado en `subrole`, o del progreso general si no viene. */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request, progressUpdateSchema);

    const targetMemberId = resolveTargetMemberId(session, body.memberId);
    if (!targetMemberId) return NO_TARGET;

    const updated = await StorageService.updateProgress(
      targetMemberId,
      [body.p1GarudaPct, body.p2IfritPct, body.p3TitanPct, body.p4UltimaPct, body.p5RoulettePct],
      body.subrole ?? null
    );

    return NextResponse.json({ success: true, progress: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Alterna entre un mismo progreso para todos los roles y un progreso por rol. */
export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request, progressModeUpdateSchema);

    const targetMemberId = resolveTargetMemberId(session, body.memberId);
    if (!targetMemberId) return NO_TARGET;

    const updated = await StorageService.setProgressMode(targetMemberId, body.mode);

    return NextResponse.json({ success: true, progress: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * Descarta el progreso propio de un rol, que vuelve así a heredar el general.
 *
 * No borra nada del progreso general: sin `subrole` la petición se rechaza en vez de
 * interpretarse como "bórralo todo".
 */
export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const parsed = subroleSchema.safeParse(searchParams.get('subrole'));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Indica un rol válido cuyo progreso propio se va a descartar.' },
        { status: 400 }
      );
    }

    const targetMemberId = resolveTargetMemberId(
      session,
      searchParams.get('memberId') ?? undefined
    );
    if (!targetMemberId) return NO_TARGET;

    const updated = await StorageService.clearRoleProgress(targetMemberId, parsed.data);

    return NextResponse.json({ success: true, progress: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
