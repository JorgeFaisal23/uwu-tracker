import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { memberUpdateSchema } from '@/lib/schemas';
import { requireAdmin, requireSelfOrAdmin } from '@/lib/session';
import { errorResponse, parseBody, ApiError } from '@/lib/api';
import { verifyPassword } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await parseBody(request, memberUpdateSchema);

    // Reseteo administrativo: fija una contraseña nueva sin conocer la anterior, así que
    // queda reservado al admin. Antes esta rama no comprobaba nada y permitía a
    // cualquiera tomar la cuenta de cualquier miembro.
    if ('action' in body && body.action === 'resetPassword') {
      await requireAdmin();
      await StorageService.resetMemberPassword(id, body.newPassword);
      return NextResponse.json({ success: true, message: 'Contraseña restablecida.' });
    }

    const session = await requireSelfOrAdmin(id);

    // Para cambiar la propia contraseña hay que demostrar que se conoce la actual;
    // de lo contrario, una sesión olvidada en un equipo ajeno bastaría para secuestrarla.
    if (body.newPassword && session.type !== 'ADMIN') {
      const member = await StorageService.getMemberById(id);
      if (!member) throw new ApiError('Miembro no encontrado.', 404);

      if (
        !body.currentPassword ||
        !(await verifyPassword(body.currentPassword, member.passwordHash))
      ) {
        throw new ApiError('La contraseña actual no es correcta.', 400);
      }
    }

    const updated = await StorageService.updateMemberProfile(id, {
      mainJob: body.mainJob,
      flexJobs: body.flexJobs,
      tankStance: body.tankStance,
      newPasswordPlain: body.newPassword,
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
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();

    const { id } = await params;
    await StorageService.deleteMember(id);

    return NextResponse.json({ success: true, message: 'Miembro dado de baja.' });
  } catch (err) {
    return errorResponse(err);
  }
}
