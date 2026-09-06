import type { Member, MemberProgress, SubRole, UwuProgress } from '@/types';
import {
  FFXIV_JOBS,
  SUBROLE_LABELS,
  calculateOverallScore,
  clampPhasePct,
  getCurrentPhaseName,
  normalizePhaseProgress,
} from './ffxiv-jobs';

/**
 * Los subroles que pueden llevar progreso propio, en el orden de los puestos de la
 * party (MT/OT, PH, SH, M1/M2, PR, C). Es el mismo conjunto que usa `SLOT_SPECS`:
 * cada puesto que el buscador tiene que rellenar puede valorarse por separado.
 */
export const PROGRESS_SUBROLES: SubRole[] = [
  'TANK',
  'PURE_HEALER',
  'SHIELD_HEALER',
  'MELEE',
  'PHYS_RANGED',
  'CASTER',
];

/** Etiqueta corta para las pestañas de rol; la larga vive en `SUBROLE_LABELS`. */
export const SUBROLE_SHORT_LABELS: Record<SubRole, string> = {
  TANK: 'Tank',
  PURE_HEALER: 'Pure H.',
  SHIELD_HEALER: 'Shield H.',
  MELEE: 'Melee',
  PHYS_RANGED: 'Phys R.',
  CASTER: 'Caster',
};

export { SUBROLE_LABELS };

export function buildProgress(
  memberId: string,
  subrole: SubRole | null,
  pcts: [number, number, number, number, number],
  updatedAt: string
): UwuProgress {
  const [p1, p2, p3, p4, p5] = normalizePhaseProgress(pcts);

  return {
    memberId,
    subrole,
    p1GarudaPct: p1,
    p2IfritPct: p2,
    p3TitanPct: p3,
    p4UltimaPct: p4,
    p5RoulettePct: p5,
    overallScore: calculateOverallScore(p1, p2, p3, p4, p5),
    currentPhaseName: getCurrentPhaseName(p1, p2, p3, p4, p5),
    updatedAt,
  };
}

export function emptyProgress(memberId: string, subrole: SubRole | null = null): UwuProgress {
  return buildProgress(memberId, subrole, [0, 0, 0, 0, 0], new Date().toISOString());
}

export function emptyMemberProgress(memberId: string): MemberProgress {
  return {
    memberId,
    mode: 'UNIFIED',
    general: emptyProgress(memberId),
    byRole: {},
  };
}

/**
 * El progreso con el que un miembro juega un subrol concreto.
 *
 * En modo unificado, y también para los roles que no tienen ajuste propio, es el
 * progreso general. Así, quien no toque nada sigue funcionando exactamente igual que
 * antes de que existiera el progreso por rol.
 */
export function resolveRoleProgress(
  memberProgress: MemberProgress | undefined,
  subrole: SubRole | null | undefined,
  memberId?: string
): UwuProgress {
  if (!memberProgress) return emptyProgress(memberId ?? '', subrole ?? null);

  if (memberProgress.mode !== 'PER_ROLE' || !subrole) return memberProgress.general;

  return memberProgress.byRole[subrole] ?? memberProgress.general;
}

export function roleProgressScore(
  memberProgress: MemberProgress | undefined,
  subrole: SubRole | null | undefined
): number {
  return resolveRoleProgress(memberProgress, subrole).overallScore;
}

/**
 * El progreso que representa a un miembro cuando hay que enseñar uno solo: el roster,
 * el promedio de la FC, el orden por prioridad y la foto semanal.
 *
 * Con progreso por rol se toma el de su main job, que es el rol con el que se le
 * cuenta por defecto. Los demás siguen consultándose por separado.
 */
export function memberDisplayProgress(
  member: Pick<Member, 'id' | 'mainJob'>,
  memberProgress: MemberProgress | undefined
): UwuProgress {
  return resolveRoleProgress(memberProgress, FFXIV_JOBS[member.mainJob]?.subrole, member.id);
}

/** Los subroles que el miembro puede cubrir con su main job o sus flex jobs. */
export function playableSubroles(member: Pick<Member, 'mainJob' | 'flexJobs'>): SubRole[] {
  const jobs = [member.mainJob, ...(member.flexJobs ?? [])];
  const owned = new Set<SubRole>();

  for (const job of jobs) {
    const subrole = FFXIV_JOBS[job]?.subrole;
    if (subrole) owned.add(subrole);
  }

  return PROGRESS_SUBROLES.filter(sr => owned.has(sr));
}

/**
 * Los roles que tiene sentido mostrar en el editor: los que el miembro puede jugar y,
 * además, cualquiera con un valor ya guardado, para que un cambio de jobs no esconda
 * un progreso que la persona sí llegó a registrar.
 */
export function editableSubroles(
  member: Pick<Member, 'mainJob' | 'flexJobs'>,
  memberProgress: MemberProgress | undefined
): SubRole[] {
  const playable = new Set(playableSubroles(member));
  const stored = new Set(Object.keys(memberProgress?.byRole ?? {}) as SubRole[]);

  return PROGRESS_SUBROLES.filter(sr => playable.has(sr) || stored.has(sr));
}
