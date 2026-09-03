import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { mainJob, flexJobs, tankStance, newPassword, action } = body;

    if (action === 'resetPassword') {
      if (!newPassword) {
        return NextResponse.json({ error: 'Nueva contraseña requerida.' }, { status: 400 });
      }
      await StorageService.resetMemberPassword(id, newPassword);
      return NextResponse.json({ success: true, message: 'Contraseña actualizada.' });
    }

    const updated = await StorageService.updateMemberProfile(id, {
      mainJob,
      flexJobs,
      tankStance,
      newPasswordPlain: newPassword,
    });

    return NextResponse.json({
      success: true,
      member: {
        id: updated.id,
        characterName: updated.characterName,
        mainJob: updated.mainJob,
        flexJobs: updated.flexJobs,
        tankStance: updated.tankStance,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar miembro';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    StorageService.deleteMember(id);
    return NextResponse.json({ success: true, message: 'Miembro eliminado con éxito.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar miembro';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
