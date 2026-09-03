import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function GET() {
  try {
    const members = StorageService.getMembers().map(m => ({
      id: m.id,
      characterName: m.characterName,
      mainJob: m.mainJob,
      flexJobs: m.flexJobs,
      tankStance: m.tankStance,
      createdAt: m.createdAt,
    }));

    const progressMap = StorageService.getProgressMap();

    return NextResponse.json({
      members,
      progressMap,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener miembros';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
