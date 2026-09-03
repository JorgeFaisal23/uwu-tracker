import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { verifyPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, characterName, password, mainJob, flexJobs, tankStance } = body;

    if (!characterName || !password) {
      return NextResponse.json(
        { error: 'El nombre de personaje y la contraseña son requeridos.' },
        { status: 400 }
      );
    }

    if (action === 'register') {
      if (!mainJob) {
        return NextResponse.json(
          { error: 'Debes seleccionar un Main Job.' },
          { status: 400 }
        );
      }

      const newMember = await StorageService.registerMember({
        characterName,
        passwordPlain: password,
        mainJob,
        flexJobs,
        tankStance,
      });

      return NextResponse.json({
        success: true,
        member: {
          id: newMember.id,
          characterName: newMember.characterName,
          mainJob: newMember.mainJob,
          flexJobs: newMember.flexJobs,
          tankStance: newMember.tankStance,
        },
      });
    }

    if (action === 'login') {
      const member = StorageService.getMemberByName(characterName);
      if (!member) {
        return NextResponse.json(
          { error: 'Miembro no encontrado. Por favor regístrate primero.' },
          { status: 404 }
        );
      }

      const isValid = await verifyPassword(password, member.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Contraseña incorrecta.' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        member: {
          id: member.id,
          characterName: member.characterName,
          mainJob: member.mainJob,
          flexJobs: member.flexJobs,
          tankStance: member.tankStance,
        },
      });
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error en autenticación';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
