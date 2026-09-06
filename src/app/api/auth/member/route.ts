import { NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { verifyPassword } from '@/lib/auth';
import { memberAuthSchema } from '@/lib/schemas';
import { createSession } from '@/lib/session';
import { RateLimitError, errorResponse, parseBody } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/**
 * Límites por IP. El registro es mucho más estricto que el login porque un alta legítima
 * ocurre una vez en la vida del miembro, mientras que equivocarse al entrar es normal.
 */
const LOGIN_LIMIT = { limit: 10, windowMs: 5 * 60 * 1000 };
const REGISTER_LIMIT = { limit: 3, windowMs: 60 * 60 * 1000 };

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);

    // Antes de leer el cuerpo: rechazar una ráfaga debe ser lo más barato posible.
    const overall = rateLimit(`auth:member:${ip}`, LOGIN_LIMIT);
    if (!overall.allowed) {
      throw new RateLimitError(
        'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
        overall.retryAfterSeconds
      );
    }

    const body = await parseBody(request, memberAuthSchema);

    if (body.action === 'register') {
      const registerAttempt = rateLimit(`auth:register:${ip}`, REGISTER_LIMIT);
      if (!registerAttempt.allowed) {
        throw new RateLimitError(
          'Demasiados registros desde esta conexión. Inténtalo más tarde.',
          registerAttempt.retryAfterSeconds
        );
      }

      // Se reclama la invitación antes de tocar `members` y antes del hash bcrypt: sin
      // esto, cada intento inválido costaba ~100 ms de CPU facturable en la función
      // serverless. Lanza si el token no existe, ya se gastó, está revocado o caducó.
      const inviteId = await StorageService.claimInviteToken(body.inviteCode);

      let newMember;
      try {
        newMember = await StorageService.registerMember({
          characterName: body.characterName,
          passwordPlain: body.password,
          mainJob: body.mainJob,
          flexJobs: body.flexJobs,
          tankStance: body.tankStance,
        });
      } catch (err) {
        // El alta falló después de reclamar el token (lo habitual: nombre de personaje
        // ya registrado). Se devuelve la invitación al estado disponible, porque si no
        // un error corriente quemaría la invitación de alguien.
        await StorageService.releaseInviteToken(inviteId);
        throw err;
      }

      await StorageService.confirmInviteToken(inviteId, newMember);

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
