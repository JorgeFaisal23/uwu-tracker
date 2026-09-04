import {
  JobId,
  Member,
  MemberAvailability,
  PartyCombination,
  SubRole,
  UwuProgress,
  AssignedPartySlot,
  SlotRole,
  SlotDiagnostic,
} from '@/types';
import { FFXIV_JOBS, canPlayTankStance } from './ffxiv-jobs';

export interface MemberCandidate {
  member: Member;
  job: JobId;
  subrole: SubRole;
  isMainJob: boolean;
  progressScore: number;
}

export type SlotKey = 'mt' | 'ot' | 'ph' | 'sh' | 'm1' | 'm2' | 'pr' | 'c';
export type { SlotRole };

export interface SlotSpec {
  key: SlotKey;
  role: SlotRole;
  subrole: SubRole;
  /** Postura exigida al tanque; solo aplica a MT y OT. */
  stance?: 'MT' | 'OT';
}

/**
 * Los 8 puestos de la party, en el orden en que se resuelven.
 * Antes cada puesto era un `if (step === n)` con el mismo cuerpo repetido ocho veces.
 */
export const SLOT_SPECS: SlotSpec[] = [
  { key: 'mt', role: 'MT', subrole: 'TANK', stance: 'MT' },
  { key: 'ot', role: 'OT', subrole: 'TANK', stance: 'OT' },
  { key: 'ph', role: 'PH', subrole: 'PURE_HEALER' },
  { key: 'sh', role: 'SH', subrole: 'SHIELD_HEALER' },
  { key: 'm1', role: 'M1', subrole: 'MELEE' },
  { key: 'm2', role: 'M2', subrole: 'MELEE' },
  { key: 'pr', role: 'PR', subrole: 'PHYS_RANGED' },
  { key: 'c', role: 'C', subrole: 'CASTER' },
];


/** Cuántos puestos de la party exige cada subrol. */
const SLOTS_NEEDED_BY_SUBROLE: Record<SubRole, number> = SLOT_SPECS.reduce(
  (acc, spec) => {
    acc[spec.subrole] += 1;
    return acc;
  },
  {
    TANK: 0,
    PURE_HEALER: 0,
    SHIELD_HEALER: 0,
    MELEE: 0,
    PHYS_RANGED: 0,
    CASTER: 0,
  } as Record<SubRole, number>
);

/** Cuántas parties distintas se conservan por franja horaria. */
const MAX_COMBINATIONS = 50;

/**
 * Tope de nodos explorados por franja. Es una válvula de seguridad para rosters muy
 * grandes con mucho flex job; con el orden ascendente por progreso y la poda por cota
 * inferior, las mejores parties se encuentran mucho antes de acercarse a este número.
 */
const MAX_NODES = 500_000;

/**
 * Encuentra las mejores combinaciones de 8 jugadores para un horario concreto.
 *
 * Reglas de composición:
 * - 1 MT y 1 OT (jobs distintos, postura válida)
 * - 1 Pure Healer, 1 Shield Healer
 * - 2 Melee DPS (jobs distintos)
 * - 1 Physical Ranged DPS y 1 Magical Ranged DPS
 * - Ningún job ni ningún miembro se repite dentro de la party.
 * - Un mismo grupo de 8 personas aparece una sola vez; la única variación admitida es
 *   intercambiar MT y OT cuando ambos tanques tienen postura BOTH.
 *
 * Prioridad 1: menor progreso acumulado (se ayuda a quien va más rezagado).
 * Prioridad 2: a igualdad de progreso, más miembros en su Main Job.
 *
 * La búsqueda es un backtracking con poda por cota inferior (branch and bound). La
 * versión anterior cortaba al llegar a 50 resultados en pleno recorrido en profundidad,
 * por lo que conservaba las 50 primeras en orden arbitrario y la party de menor
 * progreso podía no llegar a generarse nunca.
 */
export function findPartyCombinationsForSlot(
  dayOfWeek: number,
  hourSlot: number,
  availabilities: MemberAvailability[],
  members: Member[],
  progressMap: Record<string, UwuProgress>,
  attendanceMap?: Record<string, number>
): PartyCombination[] {
  // 1. Miembros activos disponibles en esta franja.
  const availableMemberIds = new Set(
    availabilities
      .filter(a => a.dayOfWeek === dayOfWeek && a.hourSlot === hourSlot)
      .map(a => a.memberId)
  );

  const activeAvailableMembers = members.filter(
    m => m.isActive && availableMemberIds.has(m.id)
  );

  if (activeAvailableMembers.length < 8) return [];

  // 2. Todos los puestos que cada miembro disponible puede cubrir (main y flex).
  const candidatesBySubrole = buildCandidates(activeAvailableMembers, progressMap);

  // 3. Descarte barato: ¿hay tantos miembros distintos como puestos pide cada subrol?
  const distinctMinScores = buildDistinctMemberMinScores(candidatesBySubrole);
  for (const subrole of Object.keys(SLOTS_NEEDED_BY_SUBROLE) as SubRole[]) {
    if (distinctMinScores[subrole].length < SLOTS_NEEDED_BY_SUBROLE[subrole]) {
      return [];
    }
  }

  // 4. Cota inferior del progreso que aún falta por sumar a partir de cada puesto.
  //    Relaja la unicidad de miembros entre subroles, así que nunca sobreestima: es
  //    admisible y por tanto la poda no puede descartar la solución óptima.
  const suffixLowerBound = buildSuffixLowerBounds(distinctMinScores);

  const results = new TopCombinations(MAX_COMBINATIONS, attendanceMap);
  let nodesExplored = 0;

  const chosen: Partial<Record<SlotKey, AssignedPartySlot>> = {};
  const usedMemberIds = new Set<string>();
  const usedJobs = new Set<JobId>();

  function solve(step: number, partialScore: number, partialMainJobs: number) {
    if (nodesExplored++ > MAX_NODES) return;

    if (step === SLOT_SPECS.length) {
      results.offer(
        buildCombination(
          dayOfWeek,
          hourSlot,
          chosen as Record<SlotKey, AssignedPartySlot>,
          partialScore,
          partialMainJobs
        )
      );
      return;
    }

    // Poda: ni en el mejor de los casos esta rama mejora lo que ya está guardado.
    if (partialScore + suffixLowerBound[step] > results.worstScore()) return;

    const spec = SLOT_SPECS[step];

    for (const cand of candidatesBySubrole[spec.subrole]) {
      if (usedMemberIds.has(cand.member.id)) continue;
      if (usedJobs.has(cand.job)) continue;
      if (spec.stance && !canPlayTankStance(cand.member.tankStance, spec.stance)) continue;

      // M1 y M2 son intercambiables: se fija un orden por id para no recorrer dos
      // veces la misma pareja de melees.
      if (spec.key === 'm2' && chosen.m1 && cand.member.id < chosen.m1.member.id) continue;

      chosen[spec.key] = {
        member: cand.member,
        job: cand.job,
        isMainJob: cand.isMainJob,
        subrole: spec.subrole,
        slotRole: spec.role,
      };
      usedMemberIds.add(cand.member.id);
      usedJobs.add(cand.job);

      solve(
        step + 1,
        partialScore + cand.progressScore,
        partialMainJobs + (cand.isMainJob ? 1 : 0)
      );

      usedMemberIds.delete(cand.member.id);
      usedJobs.delete(cand.job);
      delete chosen[spec.key];
    }
  }

  solve(0, 0, 0);

  // 5. Orden final: menor progreso primero; a igualdad, más main jobs; a igualdad, menor asistencia.
  const combinations = results.values().sort((a, b) => compareCombinations(a, b, attendanceMap));

  combinations.forEach((comb, idx) => {
    comb.priorityRank = idx + 1;
    comb.id = `party-${dayOfWeek}-${hourSlot}-${idx + 1}`;
  });

  return combinations;
}

export function buildCandidates(
  availableMembers: Member[],
  progressMap: Record<string, UwuProgress>
): Record<SubRole, MemberCandidate[]> {
  const bySubrole: Record<SubRole, MemberCandidate[]> = {
    TANK: [],
    PURE_HEALER: [],
    SHIELD_HEALER: [],
    MELEE: [],
    PHYS_RANGED: [],
    CASTER: [],
  };

  for (const member of availableMembers) {
    const progressScore = progressMap[member.id]?.overallScore ?? 0;

    const playableJobs: { job: JobId; isMain: boolean }[] = [
      { job: member.mainJob, isMain: true },
      ...(member.flexJobs || []).map(j => ({ job: j, isMain: false })),
    ];

    const seenJobs = new Set<JobId>();
    for (const pj of playableJobs) {
      if (seenJobs.has(pj.job)) continue;
      seenJobs.add(pj.job);

      const jobInfo = FFXIV_JOBS[pj.job];
      if (!jobInfo) continue;

      bySubrole[jobInfo.subrole].push({
        member,
        job: pj.job,
        subrole: jobInfo.subrole,
        isMainJob: pj.isMain,
        progressScore,
      });
    }
  }

  // Explorar primero a quien menos ha progresado hace que las mejores parties
  // aparezcan pronto, lo que a su vez hace que la poda sea efectiva desde el inicio.
  // A igualdad de progreso se prefiere el main job (Prioridad 2).
  for (const subrole of Object.keys(bySubrole) as SubRole[]) {
    bySubrole[subrole].sort(
      (a, b) =>
        a.progressScore - b.progressScore || Number(b.isMainJob) - Number(a.isMainJob)
    );
  }

  return bySubrole;
}

/**
 * Por subrol, el progreso mínimo de cada miembro distinto que puede cubrirlo, en orden
 * ascendente. Sirve para calcular la cota inferior sin contar dos veces al mismo
 * miembro por tener varios jobs del mismo subrol.
 */
function buildDistinctMemberMinScores(
  candidatesBySubrole: Record<SubRole, MemberCandidate[]>
): Record<SubRole, number[]> {
  const result = {} as Record<SubRole, number[]>;

  for (const subrole of Object.keys(candidatesBySubrole) as SubRole[]) {
    const minByMember = new Map<string, number>();
    for (const cand of candidatesBySubrole[subrole]) {
      const prev = minByMember.get(cand.member.id);
      if (prev === undefined || cand.progressScore < prev) {
        minByMember.set(cand.member.id, cand.progressScore);
      }
    }
    result[subrole] = Array.from(minByMember.values()).sort((a, b) => a - b);
  }

  return result;
}

/**
 * suffixLowerBound[i] = mínimo progreso que aún se sumará al cubrir los puestos i..7.
 */
function buildSuffixLowerBounds(distinctMinScores: Record<SubRole, number[]>): number[] {
  const bounds: number[] = new Array(SLOT_SPECS.length + 1).fill(0);

  for (let step = SLOT_SPECS.length - 1; step >= 0; step--) {
    // De los puestos que quedan (step..7), cuántos pide cada subrol.
    const needed = new Map<SubRole, number>();
    for (let j = step; j < SLOT_SPECS.length; j++) {
      const sr = SLOT_SPECS[j].subrole;
      needed.set(sr, (needed.get(sr) ?? 0) + 1);
    }

    let total = 0;
    for (const [subrole, count] of needed) {
      const scores = distinctMinScores[subrole];
      for (let k = 0; k < count && k < scores.length; k++) {
        total += scores[k];
      }
    }
    bounds[step] = total;
  }

  return bounds;
}

function buildCombination(
  dayOfWeek: number,
  hourSlot: number,
  slots: Record<SlotKey, AssignedPartySlot>,
  totalProgressScore: number,
  mainJobsCount: number
): PartyCombination {
  return {
    id: '',
    dayOfWeek,
    hourSlot,
    slots: { ...slots },
    totalProgressScore,
    mainJobsCount,
    avgProgressScore: Math.round(totalProgressScore / 8),
    priorityRank: 0,
  };
}

/**
 * Identificador canónico de una party: el conjunto de 8 personas.
 *
 * Se distingue además el reparto MT/OT únicamente cuando ambos tanques pueden jugar
 * las dos posturas, que es la única variación que el Admin puede querer elegir.
 */
function signatureOf(comb: PartyCombination): string {
  const s = comb.slots;
  const memberIdsSorted = [s.mt, s.ot, s.ph, s.sh, s.m1, s.m2, s.pr, s.c]
    .map(slot => slot.member.id)
    .sort()
    .join('|');

  const bothTanksCanFlexStance =
    s.mt.member.tankStance === 'BOTH' && s.ot.member.tankStance === 'BOTH';

  return bothTanksCanFlexStance
    ? `${memberIdsSorted}__MT:${s.mt.member.id}__OT:${s.ot.member.id}`
    : memberIdsSorted;
}

function totalAttendanceOf(
  comb: PartyCombination,
  attendanceMap?: Record<string, number>
): number {
  if (!attendanceMap) return 0;
  const s = comb.slots;
  return (
    (attendanceMap[s.mt.member.id] ?? 0) +
    (attendanceMap[s.ot.member.id] ?? 0) +
    (attendanceMap[s.ph.member.id] ?? 0) +
    (attendanceMap[s.sh.member.id] ?? 0) +
    (attendanceMap[s.m1.member.id] ?? 0) +
    (attendanceMap[s.m2.member.id] ?? 0) +
    (attendanceMap[s.pr.member.id] ?? 0) +
    (attendanceMap[s.c.member.id] ?? 0)
  );
}

/**
 * Menor progreso primero; a igualdad, más main jobs; a igualdad, menor asistencia histórica (rotación equitativa).
 */
export function compareCombinations(
  a: PartyCombination,
  b: PartyCombination,
  attendanceMap?: Record<string, number>
): number {
  const progressDiff = a.totalProgressScore - b.totalProgressScore;
  if (progressDiff !== 0) return progressDiff;

  const mainJobsDiff = b.mainJobsCount - a.mainJobsCount;
  if (mainJobsDiff !== 0) return mainJobsDiff;

  if (attendanceMap) {
    const attA = totalAttendanceOf(a, attendanceMap);
    const attB = totalAttendanceOf(b, attendanceMap);
    if (attA !== attB) return attA - attB;
  }

  return 0;
}

/**
 * Conserva las K mejores parties distintas encontradas y expone el peor progreso
 * guardado, que es lo que permite podar el resto de la búsqueda.
 */
class TopCombinations {
  private readonly bySignature = new Map<string, PartyCombination>();
  private cachedWorst: PartyCombination | null = null;

  constructor(
    private readonly capacity: number,
    private readonly attendanceMap?: Record<string, number>
  ) {}

  offer(comb: PartyCombination): void {
    const signature = signatureOf(comb);
    const existing = this.bySignature.get(signature);

    if (existing) {
      // Mismo grupo de 8: nos quedamos con el mejor reparto de jobs.
      if (compareCombinations(comb, existing, this.attendanceMap) < 0) {
        this.bySignature.set(signature, comb);
        this.cachedWorst = null;
      }
      return;
    }

    if (this.bySignature.size < this.capacity) {
      this.bySignature.set(signature, comb);
      this.cachedWorst = null;
      return;
    }

    const worst = this.worst();
    if (worst && compareCombinations(comb, worst, this.attendanceMap) < 0) {
      this.bySignature.delete(signatureOf(worst));
      this.bySignature.set(signature, comb);
      this.cachedWorst = null;
    }
  }

  /**
   * Progreso por encima del cual una rama ya no puede aportar nada. Mientras no se
   * haya llenado el cupo no se poda nada.
   */
  worstScore(): number {
    if (this.bySignature.size < this.capacity) return Number.POSITIVE_INFINITY;
    return this.worst()?.totalProgressScore ?? Number.POSITIVE_INFINITY;
  }

  values(): PartyCombination[] {
    return Array.from(this.bySignature.values());
  }

  private worst(): PartyCombination | null {
    if (this.cachedWorst) return this.cachedWorst;

    let worst: PartyCombination | null = null;
    for (const comb of this.bySignature.values()) {
      if (!worst || compareCombinations(comb, worst, this.attendanceMap) > 0) worst = comb;
    }
    this.cachedWorst = worst;
    return worst;
  }
}

/**
 * Recorre la semana completa y devuelve, por franja, las parties viables.
 *
 * El descarte previo por número de disponibles evita entrar al backtracking en la
 * inmensa mayoría de las 168 franjas.
 */
export function scanAllViableSlots(
  availabilities: MemberAvailability[],
  members: Member[],
  progressMap: Record<string, UwuProgress>,
  attendanceMap?: Record<string, number>
): Record<string, PartyCombination[]> {
  const activeMemberIds = new Set(members.filter(m => m.isActive).map(m => m.id));

  // Cuántos miembros activos hay en cada franja, en una sola pasada.
  const countBySlot = new Map<string, number>();
  for (const a of availabilities) {
    if (!activeMemberIds.has(a.memberId)) continue;
    const key = `${a.dayOfWeek}_${a.hourSlot}`;
    countBySlot.set(key, (countBySlot.get(key) ?? 0) + 1);
  }

  const result: Record<string, PartyCombination[]> = {};

  for (const [key, count] of countBySlot) {
    if (count < 8) continue;

    const [day, hour] = key.split('_').map(Number);
    const combinations = findPartyCombinationsForSlot(
      day,
      hour,
      availabilities,
      members,
      progressMap,
      attendanceMap
    );
    if (combinations.length > 0) result[key] = combinations;
  }

  return result;
}

/**
 * Diagnóstico exacto de quórum mediante emparejamiento bipartito máximo (algoritmo de Kuhn).
 *
 * Si el emparejamiento es menor a 8:
 * - availableCount < 8 -> 'FALTAN_PERSONAS'
 * - availableCount >= 8 -> 'FALTAN_ROLES'
 * Si el emparejamiento es 8 pero no se encuentra party válida (por jobs repetidos):
 * - 'JOBS_REPETIDOS'
 * Si la franja ya tiene party viable:
 * - devuelve null (no hay déficit).
 */
export function diagnoseSlot(
  dayOfWeek: number,
  hourSlot: number,
  availabilities: MemberAvailability[],
  members: Member[],
  progressMap: Record<string, UwuProgress>
): SlotDiagnostic | null {
  const availableMemberIds = new Set(
    availabilities
      .filter(a => a.dayOfWeek === dayOfWeek && a.hourSlot === hourSlot)
      .map(a => a.memberId)
  );

  const activeAvailableMembers = members.filter(
    m => m.isActive && availableMemberIds.has(m.id)
  );

  if (activeAvailableMembers.length === 0) return null;

  const candidatesBySubrole = buildCandidates(activeAvailableMembers, progressMap);

  // Grafo bipartito: Miembros (0..k-1) <-> Slots (0..7)
  const k = activeAvailableMembers.length;
  const adj: boolean[][] = Array.from({ length: k }, () => new Array(8).fill(false));

  for (let u = 0; u < k; u++) {
    const member = activeAvailableMembers[u];
    for (let v = 0; v < SLOT_SPECS.length; v++) {
      const spec = SLOT_SPECS[v];
      const hasJobForSubrole = candidatesBySubrole[spec.subrole].some(
        c => c.member.id === member.id
      );
      if (!hasJobForSubrole) continue;
      if (spec.stance && !canPlayTankStance(member.tankStance, spec.stance)) continue;
      adj[u][v] = true;
    }
  }

  // Algoritmo de Kuhn para emparejamiento bipartito máximo
  const matchV = new Array<number>(8).fill(-1);

  function dfs(u: number, visitedSlots: boolean[]): boolean {
    for (let v = 0; v < 8; v++) {
      if (!adj[u][v] || visitedSlots[v]) continue;
      visitedSlots[v] = true;
      if (matchV[v] === -1 || dfs(matchV[v], visitedSlots)) {
        matchV[v] = u;
        return true;
      }
    }
    return false;
  }

  let matchCount = 0;
  for (let u = 0; u < k; u++) {
    const visitedSlots = new Array<boolean>(8).fill(false);
    if (dfs(u, visitedSlots)) {
      matchCount++;
    }
  }

  if (matchCount < 8) {
    const missingSlots = SLOT_SPECS.filter((_, idx) => matchV[idx] === -1).map(s => s.role);
    return {
      dayOfWeek,
      hourSlot,
      availableCount: activeAvailableMembers.length,
      missingSlots,
      reason: activeAvailableMembers.length < 8 ? 'FALTAN_PERSONAS' : 'FALTAN_ROLES',
    };
  }

  // Si matchCount === 8, comprobar si el solver encuentra al menos una combinación sin jobs duplicados
  const viable = findPartyCombinationsForSlot(
    dayOfWeek,
    hourSlot,
    availabilities,
    members,
    progressMap
  );

  if (viable.length === 0) {
    return {
      dayOfWeek,
      hourSlot,
      availableCount: activeAvailableMembers.length,
      missingSlots: [],
      reason: 'JOBS_REPETIDOS',
    };
  }

  return null;
}

/**
 * Diagnostica las mejores franjas no viables cercanas al quórum (con al menos 6 disponibles).
 * Ordena por cercanía al quórum y devuelve las 5 mejores.
 */
export function diagnoseAllNearMissSlots(
  availabilities: MemberAvailability[],
  members: Member[],
  progressMap: Record<string, UwuProgress>,
  maxResults = 5
): SlotDiagnostic[] {
  const activeMemberIds = new Set(members.filter(m => m.isActive).map(m => m.id));

  const countBySlot = new Map<string, number>();
  for (const a of availabilities) {
    if (!activeMemberIds.has(a.memberId)) continue;
    const key = `${a.dayOfWeek}_${a.hourSlot}`;
    countBySlot.set(key, (countBySlot.get(key) ?? 0) + 1);
  }

  const diagnostics: SlotDiagnostic[] = [];

  for (const [key, count] of countBySlot) {
    if (count < 6) continue;

    const [day, hour] = key.split('_').map(Number);
    const diag = diagnoseSlot(day, hour, availabilities, members, progressMap);
    if (diag) {
      diagnostics.push(diag);
    }
  }

  diagnostics.sort((a, b) => {
    if (b.availableCount !== a.availableCount) {
      return b.availableCount - a.availableCount;
    }
    if (a.missingSlots.length !== b.missingSlots.length) {
      return a.missingSlots.length - b.missingSlots.length;
    }
    return a.dayOfWeek - b.dayOfWeek || a.hourSlot - b.hourSlot;
  });

  return diagnostics.slice(0, maxResults);
}

