import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { requireSession } from '@/lib/session';
import { errorResponse } from '@/lib/api';

/**
 * Roster completo. Exige sesión: el listado es la lista de miembros de la FC con su
 * progreso, y era la plantilla que usó el alta masiva de septiembre de 2026 para
 * fabricar perfiles con pinta de reales.
 */
export async function GET() {
  try {
    await requireSession();

    const [allMembers, progressMap, attendanceCounts] = await Promise.all([
      StorageService.getMembers(),
      StorageService.getProgressMap(),
      StorageService.getAttendanceCounts(),
    ]);

    // El hash de contraseña nunca sale del servidor.
    const members = allMembers.map(m => ({
      id: m.id,
      characterName: m.characterName,
      mainJob: m.mainJob,
      flexJobs: m.flexJobs,
      tankStance: m.tankStance,
      isActive: m.isActive,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({ members, progressMap, attendanceCounts });
  } catch (err) {
    return errorResponse(err);
  }
}

