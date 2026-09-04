import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { requireAdmin } from '@/lib/session';
import { errorResponse } from '@/lib/api';

export async function GET() {
  try {
    const snapshots = await StorageService.getWeeklySnapshots();
    return NextResponse.json({ snapshots });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Cierra y archiva la semana del calendario indicada o en curso. Solo accesible para el Administrador. */
export async function POST(request: Request) {
  try {
    await requireAdmin();

    let body: { year?: number; weekNumber?: number } = {};
    try {
      body = await request.json();
    } catch {
      // Body opcional: si no viene JSON, se usa la semana del calendario en curso.
    }

    const snapshot = await StorageService.createWeeklySnapshot({
      year: body.year ? Number(body.year) : undefined,
      weekNumber: body.weekNumber ? Number(body.weekNumber) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Semana ${snapshot.weekNumber} de ${snapshot.year} aceptada y archivada en el histórico.`,
      snapshot,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Elimina una semana archivada del histórico. Solo accesible para el Administrador. */
export async function DELETE(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year'));
    const weekNumber = Number(searchParams.get('weekNumber'));

    if (!year || !weekNumber || isNaN(year) || isNaN(weekNumber)) {
      return NextResponse.json(
        { error: 'Parámetros year y weekNumber son obligatorios y deben ser numéricos.' },
        { status: 400 }
      );
    }

    await StorageService.deleteWeeklySnapshot(year, weekNumber);

    return NextResponse.json({
      success: true,
      message: `Semana ${weekNumber} de ${year} eliminada del registro histórico.`,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

