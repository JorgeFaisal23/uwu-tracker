import { z } from 'zod';
import { FFXIV_JOBS } from './ffxiv-jobs';
import { PROGRESS_SUBROLES } from './progress';
import type { JobId, SubRole } from '@/types';

const JOB_IDS = Object.keys(FFXIV_JOBS) as [JobId, ...JobId[]];

export const jobIdSchema = z.enum(JOB_IDS);

export const subroleSchema = z.enum(PROGRESS_SUBROLES as [SubRole, ...SubRole[]]);

export const progressModeSchema = z.enum(['UNIFIED', 'PER_ROLE']);

export const tankStanceSchema = z.enum(['MT', 'OT', 'BOTH']).nullable();

export const slotRoleSchema = z.enum(['MT', 'OT', 'PH', 'SH', 'M1', 'M2', 'PR', 'C']);

export const characterNameSchema = z
  .string()
  .trim()
  .min(3, 'El nombre de personaje debe tener al menos 3 caracteres.')
  .max(100, 'El nombre de personaje es demasiado largo.');

/**
 * Nombre de personaje: de una a tres palabras, cada una de 2 a 15 caracteres, formadas
 * solo por letras (con acentos), apóstrofo o guion. Sin dígitos ni símbolos.
 *
 * Solo se aplica al registro, nunca al login: endurecer también el login dejaría fuera
 * a cualquier miembro legítimo ya registrado cuyo nombre no encaje en el patrón.
 *
 * Se admite una sola palabra a propósito. Exigir "Nombre Apellido" parecía lo correcto
 * —es lo que impone FFXIV—, pero el roster real contiene nicks de una palabra ("Eros",
 * "Kami") de miembros con progreso y disponibilidad registrados. La regla estricta los
 * habría dejado fuera de su propia Free Company.
 *
 * Es la segunda barrera contra el alta automatizada; la primera es el código de
 * invitación. Basta con prohibir dígitos y símbolos para rechazar las 800 cuentas del
 * ataque de septiembre de 2026, cuyos nombres eran cadenas base62 aleatorias del tipo
 * "05Nz1eA75B164Ekf YmzZGkL4ZFPX5NRe" o secuencias de símbolos como "@''#¨Íýlý".
 */
export const ffxivCharacterNameSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]{1,14}(?: [A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]{1,14}){0,2}$/,
    'El nombre solo puede contener letras, apóstrofo o guion, en un máximo de tres palabras.'
  );

/**
 * Código de invitación de la FC. Solo se valida que venga algo; la comprobación real es
 * en el servidor: se busca el hash del token y se reclama de forma atómica.
 */
export const inviteCodeSchema = z
  .string()
  .trim()
  .min(1, 'El código de invitación es requerido.')
  .max(200, 'El código de invitación es demasiado largo.');

export const passwordSchema = z
  .string()
  .min(6, 'La contraseña debe tener al menos 6 caracteres.')
  .max(200, 'La contraseña es demasiado larga.');

/** Porcentaje de una fase de UWU. */
const phasePctSchema = z.coerce
  .number()
  .refine(Number.isFinite, 'Debe ser un número.')
  .int('Debe ser un número entero.')
  .min(0, 'No puede ser menor que 0.')
  .max(100, 'No puede ser mayor que 100.');

/**
 * Un job no puede ser a la vez principal y secundario, ni repetirse entre los flex.
 *
 * La interfaz ya lo impedía —el botón del main job ni siquiera se dibuja en la rejilla
 * de flex—, pero la regla vivía solo en el navegador y el servidor aceptaba cualquier
 * combinación. El alta masiva de septiembre de 2026 dejó justo esa huella: filas con
 * `main_job = "SCH"` y `flex_jobs = ["SCH","DRK"]`, imposibles de producir con clics.
 * Validarlo aquí cierra el hueco y, de paso, mantiene esa huella como señal fiable de
 * que una fila no salió de la aplicación.
 */
function checkJobSelection(
  data: { mainJob?: JobId; flexJobs?: JobId[] },
  ctx: z.RefinementCtx
): void {
  const { mainJob, flexJobs } = data;
  if (!flexJobs) return;

  if (mainJob && flexJobs.includes(mainJob)) {
    ctx.addIssue({
      code: 'custom',
      path: ['flexJobs'],
      message: 'El main job no puede figurar también como flex job.',
    });
  }

  if (new Set(flexJobs).size !== flexJobs.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['flexJobs'],
      message: 'Hay flex jobs repetidos.',
    });
  }
}

// --- Autenticación ---------------------------------------------------------

export const memberLoginSchema = z.object({
  action: z.literal('login'),
  characterName: characterNameSchema,
  password: z.string().min(1, 'La contraseña es requerida.'),
});

export const memberRegisterSchema = z
  .object({
    action: z.literal('register'),
    characterName: ffxivCharacterNameSchema,
    password: passwordSchema,
    inviteCode: inviteCodeSchema,
    mainJob: jobIdSchema,
    flexJobs: z.array(jobIdSchema).max(20).default([]),
    tankStance: tankStanceSchema.optional().default(null),
  })
  .superRefine(checkJobSelection);

export const memberAuthSchema = z.discriminatedUnion('action', [
  memberLoginSchema,
  memberRegisterSchema,
]);

/**
 * Alta de una invitación. La caducidad es opcional: sin ella el token no expira, que es
 * lo razonable cuando se le pasa a alguien que entrará "cuando pueda".
 */
export const createInviteSchema = z.object({
  label: z.string().trim().max(100).optional(),
  expiresInDays: z.coerce.number().int().min(1).max(365).nullable().optional(),
});

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'El usuario es requerido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

// --- Progreso --------------------------------------------------------------

export const progressUpdateSchema = z.object({
  /**
   * Solo lo puede usar el administrador para editar a otro miembro. En una sesión de
   * miembro se ignora y se usa el id de la sesión, para que nadie pueda alterar el
   * progreso ajeno enviando otro id.
   */
  memberId: z.string().min(1).optional(),
  /**
   * Rol al que pertenece este progreso. Ausente o null = progreso general, el que
   * heredan todos los roles que no tengan uno propio.
   */
  subrole: subroleSchema.nullable().optional(),
  p1GarudaPct: phasePctSchema,
  p2IfritPct: phasePctSchema,
  p3TitanPct: phasePctSchema,
  p4UltimaPct: phasePctSchema,
  p5RoulettePct: phasePctSchema,
});

/** Alterna entre un progreso único para todos los roles y uno por rol. */
export const progressModeUpdateSchema = z.object({
  memberId: z.string().min(1).optional(),
  mode: progressModeSchema,
});

// --- Disponibilidad --------------------------------------------------------

export const availabilitySchema = z.object({
  memberId: z.string().min(1).optional(),
  slots: z
    .array(
      z.object({
        dayOfWeek: z.coerce.number().int().min(0).max(6),
        hourSlot: z.coerce.number().int().min(0).max(23),
      })
    )
    .max(168, 'La semana tiene 168 franjas horarias.'),
});

// --- Perfil de miembro -----------------------------------------------------

export const memberProfileUpdateSchema = z
  .object({
    action: z.literal('updateProfile').optional(),
    mainJob: jobIdSchema.optional(),
    flexJobs: z.array(jobIdSchema).max(20).optional(),
    tankStance: tankStanceSchema.optional(),
    /** Para cambiar la propia contraseña hay que demostrar que se conoce la actual. */
    currentPassword: z.string().min(1).optional(),
    newPassword: passwordSchema.optional(),
  })
  // Solo puede comprobar la petición que llega completa. Cuando se envían flex jobs sin
  // main job, la comparación necesita el valor ya guardado y la hace `updateMemberProfile`.
  .superRefine(checkJobSelection);

export const adminResetPasswordSchema = z.object({
  action: z.literal('resetPassword'),
  newPassword: passwordSchema,
});

export const memberUpdateSchema = z.union([
  adminResetPasswordSchema,
  memberProfileUpdateSchema,
]);

// --- Parties ---------------------------------------------------------------

export const schedulePartySchema = z.object({
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD.')
    .optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  hourSlot: z.coerce.number().int().min(0).max(23),
  durationHours: z.coerce.number().int().min(1).max(12).default(1),
  startTimeLabel: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
  members: z
    .array(
      z.object({
        memberId: z.string().min(1),
        characterName: z.string().min(1),
        assignedJob: jobIdSchema,
        assignedRole: slotRoleSchema,
        isMainJob: z.coerce.boolean().default(true),
      })
    )
    .length(8, 'Una party de UWU son exactamente 8 integrantes.'),
});

export const confirmAttendanceSchema = z.object({
  partyId: z.string().min(1),
  /**
   * Solo el administrador puede confirmar por otra persona. `isAdminOverride` ya no
   * se acepta desde el cliente: se deriva del tipo de sesión.
   */
  memberId: z.string().min(1).optional(),
  status: z.enum(['CONFIRMED', 'DECLINED', 'PENDING']),
});

export const volunteerPartySchema = z
  .object({
    partyScheduleId: z.string().trim().min(1).optional(),
    slotKey: z.string().trim().min(1).optional(),
    assignedJob: jobIdSchema,
    assignedRole: z.string().trim().min(1).max(50),
    availabilityNote: z.string().trim().max(500).optional(),
  })
  .refine(data => !!data.partyScheduleId || !!data.slotKey, {
    message: 'Debes indicar el ID de la party o la clave de la franja horaria.',
  });

export const removeVolunteerSchema = z
  .object({
    partyScheduleId: z.string().trim().min(1).optional(),
    slotKey: z.string().trim().min(1).optional(),
  })
  .refine(data => !!data.partyScheduleId || !!data.slotKey, {
    message: 'Debes indicar el ID de la party o la clave de la franja horaria.',
  });

export const promoteSlotSchema = z.object({
  slotKey: z.string().trim().min(1).max(50),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  hourSlot: z.coerce.number().int().min(0).max(23),
  notes: z.string().trim().max(1000).optional(),
  missingSlots: z.array(slotRoleSchema).default([]),
});

export const closePromoteSlotSchema = z.object({
  slotKey: z.string().trim().min(1).max(50),
});
