import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function GET() {
  try {
    const availabilities = StorageService.getAvailabilities();
    return NextResponse.json({ availabilities });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener disponibilidad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberId, slots } = body;

    if (!memberId || !Array.isArray(slots)) {
      return NextResponse.json(
        { error: 'memberId y arreglo de slots son requeridos.' },
        { status: 400 }
      );
    }

    StorageService.setMemberAvailability(memberId, slots);

    return NextResponse.json({
      success: true,
      message: 'Disponibilidad actualizada correctamente.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar disponibilidad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
