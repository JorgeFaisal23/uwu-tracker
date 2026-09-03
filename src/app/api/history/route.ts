import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function GET() {
  try {
    const snapshots = StorageService.getWeeklySnapshots();
    return NextResponse.json({ snapshots });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener historial';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const snapshot = StorageService.createWeeklySnapshot();
    return NextResponse.json({
      success: true,
      message: `Semana ${snapshot.weekNumber} archivada exitosamente.`,
      snapshot,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al crear snapshot semanal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
