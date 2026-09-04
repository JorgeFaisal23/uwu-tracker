import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { errorResponse } from '@/lib/api';

export async function GET() {
  try {
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

