import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { verifyPassword } from '@/lib/auth';
import { memberAuthSchema } from '@/lib/schemas';
import { createSession } from '@/lib/session';
import { errorResponse, parseBody } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, memberAuthSchema);

    if (body.action === 'register') {
      const newMember = await StorageService.registerMember({
        characterName: body.characterName,
        passwordPlain: body.password,
        mainJob: body.mainJob,
        flexJobs: body.flexJobs,
        tankStance: body.tankStance,
      });

      await createSession({
        type: 'MEMBER',
        memberId: newMember.id,
        characterName: newMember.characterName,
      });

      return NextResponse.json({
        success: true,
        session: {
          type: 'MEMBER',
          memberId: newMember.id,
          characterName: newMember.characterName,
        },
        member: publicMember(newMember),
      });
    }

    const member = await StorageService.getMemberByName(body.characterName);

    // Mismo mensaje si el personaje no existe o si la contraseña no coincide: así no
    // se puede usar el login para averiguar qué personajes están registrados.
    if (!member || !(await verifyPassword(body.password, member.passwordHash))) {
      return NextResponse.json(
        { error: 'Nombre de personaje o contraseña incorrectos.' },
        { status: 401 }
      );
    }

    await createSession({
      type: 'MEMBER',
      memberId: member.id,
      characterName: member.characterName,
    });

    return NextResponse.json({
      success: true,
      session: {
        type: 'MEMBER',
        memberId: member.id,
        characterName: member.characterName,
      },
      member: publicMember(member),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

function publicMember(member: {
  id: string;
  characterName: string;
  mainJob: string;
  flexJobs: string[];
  tankStance: string | null;
}) {
  return {
    id: member.id,
    characterName: member.characterName,
    mainJob: member.mainJob,
    flexJobs: member.flexJobs,
    tankStance: member.tankStance,
  };
}
