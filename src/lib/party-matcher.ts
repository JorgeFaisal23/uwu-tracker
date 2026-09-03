import { 
  JobId, 
  Member, 
  MemberAvailability, 
  PartyCombination, 
  SubRole, 
  UwuProgress, 
  AssignedPartySlot 
} from '@/types';
import { FFXIV_JOBS, SUBROLE_JOBS, canPlayTankStance } from './ffxiv-jobs';

interface MemberCandidate {
  member: Member;
  job: JobId;
  subrole: SubRole;
  isMainJob: boolean;
  progressScore: number;
}

/**
 * Encuentra todas las combinaciones viables de 8 jugadores para un horario específico.
 * Reglas estrictas:
 * - 1 MT y 1 OT (jobs distintos, postura válida)
 * - 1 Pure Healer
 * - 1 Shield Healer
 * - 2 Melee DPS (jobs distintos)
 * - 1 Physical Ranged DPS
 * - 1 Magical Ranged DPS
 * - Ningún job se repite en la party de 8 (8 jobs únicos).
 * - Ningún miembro se repite en la misma party.
 * - No se repiten parties con las mismas personas y diferentes jobs en el mismo rol (ej. SAM y MNK).
 * - Solo se permite variación para el mismo grupo si es MT / OT y ambos tanques son postura 'BOTH'.
 * - Prioridad 1: Menor promedio de progreso en UWU (asistencia al más rezagado).
 * - Prioridad 2: Mayor cantidad de Main Jobs activos.
 */
export function findPartyCombinationsForSlot(
  dayOfWeek: number,
  hourSlot: number,
  availabilities: MemberAvailability[],
  members: Member[],
  progressMap: Record<string, UwuProgress>
): PartyCombination[] {
  // 1. Filtrar miembros activos disponibles en este horario
  const availableMemberIds = new Set(
    availabilities
      .filter(a => a.dayOfWeek === dayOfWeek && a.hourSlot === hourSlot)
      .map(a => a.memberId)
  );

  const activeAvailableMembers = members.filter(
    m => m.isActive && availableMemberIds.has(m.id)
  );

  // Se necesitan al menos 8 miembros disponibles
  if (activeAvailableMembers.length < 8) {
    return [];
  }

  // 2. Extraer todos los roles que cada miembro disponible puede jugar (Main y Flex)
  const candidatesBySubrole: Record<SubRole, MemberCandidate[]> = {
    TANK: [],
    PURE_HEALER: [],
    SHIELD_HEALER: [],
    MELEE: [],
    PHYS_RANGED: [],
    CASTER: [],
  };

  for (const member of activeAvailableMembers) {
    const progress = progressMap[member.id];
    const progressScore = progress ? progress.overallScore : 0;

    const playableJobs: { job: JobId; isMain: boolean }[] = [
      { job: member.mainJob, isMain: true },
      ...(member.flexJobs || []).map(j => ({ job: j, isMain: false })),
    ];

    // Evitar jobs repetidos en la lista del mismo jugador
    const seenJobs = new Set<JobId>();
    for (const pj of playableJobs) {
      if (seenJobs.has(pj.job)) continue;
      seenJobs.add(pj.job);

      const jobInfo = FFXIV_JOBS[pj.job];
      if (jobInfo) {
        candidatesBySubrole[jobInfo.subrole].push({
          member,
          job: pj.job,
          subrole: jobInfo.subrole,
          isMainJob: pj.isMain,
          progressScore,
        });
      }
    }
  }

  // Comprobar si hay al menos el mínimo de candidatos por rol
  if (
    candidatesBySubrole.TANK.length < 2 ||
    candidatesBySubrole.PURE_HEALER.length < 1 ||
    candidatesBySubrole.SHIELD_HEALER.length < 1 ||
    candidatesBySubrole.MELEE.length < 2 ||
    candidatesBySubrole.PHYS_RANGED.length < 1 ||
    candidatesBySubrole.CASTER.length < 1
  ) {
    return [];
  }

  const bestCombinations = new Map<string, PartyCombination>();
  const MAX_COMBINATIONS = 50; // Limitar para performance si hay muchas combinaciones

  // Solver con backtracking para armar la party de 8
  // Slots en orden: MT, OT, PH, SH, M1, M2, PR, C
  function solve(
    currentSlots: {
      mt?: AssignedPartySlot;
      ot?: AssignedPartySlot;
      ph?: AssignedPartySlot;
      sh?: AssignedPartySlot;
      m1?: AssignedPartySlot;
      m2?: AssignedPartySlot;
      pr?: AssignedPartySlot;
      c?: AssignedPartySlot;
    },
    usedMemberIds: Set<string>,
    usedJobs: Set<JobId>,
    step: number
  ) {
    if (bestCombinations.size >= MAX_COMBINATIONS) return;

    // Paso 0: Seleccionar MT
    if (step === 0) {
      for (const cand of candidatesBySubrole.TANK) {
        if (!canPlayTankStance(cand.member.tankStance, 'MT')) continue;

        const nextUsedMembers = new Set(usedMemberIds).add(cand.member.id);
        const nextUsedJobs = new Set(usedJobs).add(cand.job);

        solve(
          {
            ...currentSlots,
            mt: {
              member: cand.member,
              job: cand.job,
              isMainJob: cand.isMainJob,
              subrole: 'TANK',
              slotRole: 'MT',
            },
          },
          nextUsedMembers,
          nextUsedJobs,
          1
        );
      }
      return;
    }

    // Paso 1: Seleccionar OT (distinto miembro, distinto job, postura OT)
    if (step === 1) {
      for (const cand of candidatesBySubrole.TANK) {
        if (usedMemberIds.has(cand.member.id)) continue;
        if (usedJobs.has(cand.job)) continue;
        if (!canPlayTankStance(cand.member.tankStance, 'OT')) continue;

        const nextUsedMembers = new Set(usedMemberIds).add(cand.member.id);
        const nextUsedJobs = new Set(usedJobs).add(cand.job);

        solve(
          {
            ...currentSlots,
            ot: {
              member: cand.member,
              job: cand.job,
              isMainJob: cand.isMainJob,
              subrole: 'TANK',
              slotRole: 'OT',
            },
          },
          nextUsedMembers,
          nextUsedJobs,
          2
        );
      }
      return;
    }

    // Paso 2: Pure Healer
    if (step === 2) {
      for (const cand of candidatesBySubrole.PURE_HEALER) {
        if (usedMemberIds.has(cand.member.id)) continue;
        if (usedJobs.has(cand.job)) continue;

        const nextUsedMembers = new Set(usedMemberIds).add(cand.member.id);
        const nextUsedJobs = new Set(usedJobs).add(cand.job);

        solve(
          {
            ...currentSlots,
            ph: {
              member: cand.member,
              job: cand.job,
              isMainJob: cand.isMainJob,
              subrole: 'PURE_HEALER',
              slotRole: 'PH',
            },
          },
          nextUsedMembers,
          nextUsedJobs,
          3
        );
      }
      return;
    }

    // Paso 3: Shield Healer
    if (step === 3) {
      for (const cand of candidatesBySubrole.SHIELD_HEALER) {
        if (usedMemberIds.has(cand.member.id)) continue;
        if (usedJobs.has(cand.job)) continue;

        const nextUsedMembers = new Set(usedMemberIds).add(cand.member.id);
        const nextUsedJobs = new Set(usedJobs).add(cand.job);

        solve(
          {
            ...currentSlots,
            sh: {
              member: cand.member,
              job: cand.job,
              isMainJob: cand.isMainJob,
              subrole: 'SHIELD_HEALER',
              slotRole: 'SH',
            },
          },
          nextUsedMembers,
          nextUsedJobs,
          4
        );
      }
      return;
    }

    // Paso 4: Melee 1
    if (step === 4) {
      for (const cand of candidatesBySubrole.MELEE) {
        if (usedMemberIds.has(cand.member.id)) continue;
        if (usedJobs.has(cand.job)) continue;

        const nextUsedMembers = new Set(usedMemberIds).add(cand.member.id);
        const nextUsedJobs = new Set(usedJobs).add(cand.job);

        solve(
          {
            ...currentSlots,
            m1: {
              member: cand.member,
              job: cand.job,
              isMainJob: cand.isMainJob,
              subrole: 'MELEE',
              slotRole: 'M1',
            },
          },
          nextUsedMembers,
          nextUsedJobs,
          5
        );
      }
      return;
    }

    // Paso 5: Melee 2 (distinto melee job y distinto miembro)
    if (step === 5) {
      for (const cand of candidatesBySubrole.MELEE) {
        if (usedMemberIds.has(cand.member.id)) continue;
        if (usedJobs.has(cand.job)) continue;

        // Evitar combinaciones conmutadas (m1=A, m2=B vs m1=B, m2=A)
        if (currentSlots.m1 && cand.member.id < currentSlots.m1.member.id) {
          continue;
        }

        const nextUsedMembers = new Set(usedMemberIds).add(cand.member.id);
        const nextUsedJobs = new Set(usedJobs).add(cand.job);

        solve(
          {
            ...currentSlots,
            m2: {
              member: cand.member,
              job: cand.job,
              isMainJob: cand.isMainJob,
              subrole: 'MELEE',
              slotRole: 'M2',
            },
          },
          nextUsedMembers,
          nextUsedJobs,
          6
        );
      }
      return;
    }

    // Paso 6: Physical Ranged DPS
    if (step === 6) {
      for (const cand of candidatesBySubrole.PHYS_RANGED) {
        if (usedMemberIds.has(cand.member.id)) continue;
        if (usedJobs.has(cand.job)) continue;

        const nextUsedMembers = new Set(usedMemberIds).add(cand.member.id);
        const nextUsedJobs = new Set(usedJobs).add(cand.job);

        solve(
          {
            ...currentSlots,
            pr: {
              member: cand.member,
              job: cand.job,
              isMainJob: cand.isMainJob,
              subrole: 'PHYS_RANGED',
              slotRole: 'PR',
            },
          },
          nextUsedMembers,
          nextUsedJobs,
          7
        );
      }
      return;
    }

    // Paso 7: Magical Ranged DPS (Caster)
    if (step === 7) {
      for (const cand of candidatesBySubrole.CASTER) {
        if (usedMemberIds.has(cand.member.id)) continue;
        if (usedJobs.has(cand.job)) continue;

        const finalSlots = {
          mt: currentSlots.mt!,
          ot: currentSlots.ot!,
          ph: currentSlots.ph!,
          sh: currentSlots.sh!,
          m1: currentSlots.m1!,
          m2: currentSlots.m2!,
          pr: currentSlots.pr!,
          c: {
            member: cand.member,
            job: cand.job,
            isMainJob: cand.isMainJob,
            subrole: 'CASTER' as SubRole,
            slotRole: 'C' as const,
          },
        };

        // Identificar canónicamente a los 8 miembros del grupo
        const memberIdsSorted = [
          finalSlots.mt.member.id,
          finalSlots.ot.member.id,
          finalSlots.ph.member.id,
          finalSlots.sh.member.id,
          finalSlots.m1.member.id,
          finalSlots.m2.member.id,
          finalSlots.pr.member.id,
          finalSlots.c.member.id,
        ].sort().join('|');

        // Excepción de Stance: Solo se permite duplicar una party para el mismo grupo
        // si es para alternar MT y OT, y únicamente si ambos tanques tienen postura 'BOTH'.
        const bothTanksCanFlexStance =
          finalSlots.mt.member.tankStance === 'BOTH' &&
          finalSlots.ot.member.tankStance === 'BOTH';

        const signature = bothTanksCanFlexStance
          ? `${memberIdsSorted}__MT:${finalSlots.mt.member.id}__OT:${finalSlots.ot.member.id}`
          : memberIdsSorted;

        // Calcular métricas para el orden de prioridad
        const allSlots = [
          finalSlots.mt,
          finalSlots.ot,
          finalSlots.ph,
          finalSlots.sh,
          finalSlots.m1,
          finalSlots.m2,
          finalSlots.pr,
          finalSlots.c,
        ];

        let totalProgressScore = 0;
        let mainJobsCount = 0;

        for (const s of allSlots) {
          const prog = progressMap[s.member.id];
          totalProgressScore += prog ? prog.overallScore : 0;
          if (s.isMainJob) mainJobsCount++;
        }

        const avgProgressScore = Math.round(totalProgressScore / 8);

        const newCombination: PartyCombination = {
          id: '',
          dayOfWeek,
          hourSlot,
          slots: finalSlots,
          totalProgressScore,
          mainJobsCount,
          avgProgressScore,
          priorityRank: 0,
        };

        const existing = bestCombinations.get(signature);
        if (!existing) {
          bestCombinations.set(signature, newCombination);
        } else if (newCombination.mainJobsCount > existing.mainJobsCount) {
          // Si para la misma configuración encontramos una opción con más Main Jobs, la reemplazamos
          bestCombinations.set(signature, newCombination);
        }

        if (bestCombinations.size >= MAX_COMBINATIONS) return;
      }
      return;
    }
  }

  solve({}, new Set(), new Set(), 0);

  const validCombinations = Array.from(bestCombinations.values());

  // 3. Ordenar por prioridad:
  // Criterio 1: Menor totalProgressScore (ayuda prioritaria al menor progreso)
  // Criterio 2: Mayor mainJobsCount (más miembros en su job principal)
  validCombinations.sort((a, b) => {
    if (a.totalProgressScore !== b.totalProgressScore) {
      return a.totalProgressScore - b.totalProgressScore; // Ascendente (menor progreso primero)
    }
    return b.mainJobsCount - a.mainJobsCount; // Descendente (más main jobs primero)
  });

  // Asignar rangos de prioridad e IDs canónicos
  validCombinations.forEach((comb, idx) => {
    comb.priorityRank = idx + 1;
    comb.id = `party-${dayOfWeek}-${hourSlot}-${idx + 1}`;
  });

  return validCombinations;
}

/**
 * Escanea toda la semana para encontrar todos los horarios donde existe al menos una party válida.
 */
export function scanAllViableSlots(
  availabilities: MemberAvailability[],
  members: Member[],
  progressMap: Record<string, UwuProgress>
): Record<string, PartyCombination[]> {
  const result: Record<string, PartyCombination[]> = {};

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const combinations = findPartyCombinationsForSlot(
        day,
        hour,
        availabilities,
        members,
        progressMap
      );
      if (combinations.length > 0) {
        result[`${day}_${hour}`] = combinations;
      }
    }
  }

  return result;
}
