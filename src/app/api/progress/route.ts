import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberId, p1GarudaPct, p2IfritPct, p3TitanPct, p4UltimaPct, p5RoulettePct } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'memberId requerido.' }, { status: 400 });
    }

    const updated = StorageService.updateProgress(
      memberId,
      Number(p1GarudaPct ?? 0),
      Number(p2IfritPct ?? 0),
      Number(p3TitanPct ?? 0),
      Number(p4UltimaPct ?? 0),
      Number(p5RoulettePct ?? 0)
    );

    return NextResponse.json({ success: true, progress: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar progreso';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
