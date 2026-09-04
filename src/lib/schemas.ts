import { z } from 'zod';
import { FFXIV_JOBS } from './ffxiv-jobs';
import type { JobId } from '@/types';

const JOB_IDS = Object.keys(FFXIV_JOBS) as [JobId, ...JobId[]];

export const jobIdSchema = z.enum(JOB_IDS);

export const tankStanceSchema = z.enum(['MT', 'OT', 'BOTH']).nullable();

export const slotRoleSchema = z.enum(['MT', 'OT', 'PH', 'SH', 'M1', 'M2', 'PR', 'C']);

export const characterNameSchema = z
  .string()
  .trim()
  .min(3, 'El nombre de personaje debe tener al menos 3 caracteres.')
  .max(100, 'El nombre de personaje es demasiado largo.');

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

// --- Autenticación ---------------------------------------------------------

export const memberLoginSchema = z.object({
  action: z.literal('login'),
  characterName: characterNameSchema,
  password: z.string().min(1, 'La contraseña es requerida.'),
});

export const memberRegisterSchema = z.object({
  action: z.literal('register'),
  characterName: characterNameSchema,
  password: passwordSchema,
  mainJob: jobIdSchema,
  flexJobs: z.array(jobIdSchema).max(20).default([]),
  tankStance: tankStanceSchema.optional().default(null),
});

export const memberAuthSchema = z.discriminatedUnion('action', [
  memberLoginSchema,
  memberRegisterSchema,
]);

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
  p1GarudaPct: phasePctSchema,
  p2IfritPct: phasePctSchema,
  p3TitanPct: phasePctSchema,
  p4UltimaPct: phasePctSchema,
  p5RoulettePct: phasePctSchema,
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

export const memberProfileUpdateSchema = z.object({
  action: z.literal('updateProfile').optional(),
  mainJob: jobIdSchema.optional(),
  flexJobs: z.array(jobIdSchema).max(20).optional(),
  tankStance: tankStanceSchema.optional(),
  /** Para cambiar la propia contraseña hay que demostrar que se conoce la actual. */
  currentPassword: z.string().min(1).optional(),
  newPassword: passwordSchema.optional(),
});

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
