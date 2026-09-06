import { describe, expect, it } from 'vitest';
import {
  findPartyCombinationsForSlot,
  scanAllViableSlots,
  diagnoseSlot,
  diagnoseAllNearMissSlots,
} from '../party-matcher';
import { FFXIV_JOBS } from '../ffxiv-jobs';
import { emptyMemberProgress, buildProgress } from '../progress';
import type {
  JobId,
  Member,
  MemberAvailability,
  MemberProgress,
  SubRole,
  TankStance,
} from '@/types';

const DAY = 5;
const HOUR = 21;

function member(
  id: string,
  mainJob: JobId,
  opts: { flexJobs?: JobId[]; tankStance?: TankStance | null } = {}
): Member {
  return {
    id,
    characterName: id,
    passwordHash: 'x',
    mainJob,
    flexJobs: opts.flexJobs ?? [],
    tankStance: opts.tankStance ?? null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const AT = '2026-01-01T00:00:00.000Z';

/** Reparte un score de 0 a 500 entre las 5 fases, que es de donde sale `overallScore`. */
function phases(score: number): [number, number, number, number, number] {
  const pcts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let left = Math.max(0, Math.min(500, score));

  for (let i = 0; i < 5; i++) {
    pcts[i] = Math.min(100, left);
    left -= pcts[i];
  }

  return pcts;
}

function progressFor(entries: Record<string, number>): Record<string, MemberProgress> {
  return Object.fromEntries(
    Object.entries(entries).map(([id, score]) => [
      id,
      {
        ...emptyMemberProgress(id),
        general: buildProgress(id, null, phases(score), AT),
      },
    ])
  );
}

/**
 * Progreso por rol: `general` es el respaldo y `byRole` los ajustes de cada subrol.
 */
function roleProgressFor(
  entries: Record<string, { general: number; byRole?: Partial<Record<SubRole, number>> }>
): Record<string, MemberProgress> {
  return Object.fromEntries(
    Object.entries(entries).map(([id, { general, byRole = {} }]) => [
      id,
      {
        memberId: id,
        mode: 'PER_ROLE' as const,
        general: buildProgress(id, null, phases(general), AT),
        byRole: Object.fromEntries(
          Object.entries(byRole).map(([sr, score]) => [
            sr,
            buildProgress(id, sr as SubRole, phases(score as number), AT),
          ])
        ) as Partial<Record<SubRole, ReturnType<typeof buildProgress>>>,
      },
    ])
  );
}

function availabilityFor(members: Member[], day = DAY, hour = HOUR): MemberAvailability[] {
  return members.map(m => ({ memberId: m.id, dayOfWeek: day, hourSlot: hour }));
}

/** Ocho miembros que cubren exactamente la composición exigida. */
function baseRoster(): Member[] {
  return [
    member('mt', 'WAR', { tankStance: 'MT' }),
    member('ot', 'GNB', { tankStance: 'OT' }),
    member('ph', 'WHM'),
    member('sh', 'SCH'),
    member('m1', 'SAM'),
    member('m2', 'NIN'),
    member('pr', 'DNC'),
    member('c', 'BLM'),
  ];
}

function allZero(members: Member[]) {
  return progressFor(Object.fromEntries(members.map(m => [m.id, 0])));
}

describe('findPartyCombinationsForSlot', () => {
  it('arma una party con la composición exacta y sin jobs repetidos', () => {
    const roster = baseRoster();
    const combos = findPartyCombinationsForSlot(
      DAY,
      HOUR,
      availabilityFor(roster),
      roster,
      allZero(roster)
    );

    expect(combos).toHaveLength(1);

    const { slots } = combos[0];
    expect(slots.mt.subrole).toBe('TANK');
    expect(slots.ot.subrole).toBe('TANK');
    expect(slots.ph.subrole).toBe('PURE_HEALER');
    expect(slots.sh.subrole).toBe('SHIELD_HEALER');
    expect(slots.m1.subrole).toBe('MELEE');
    expect(slots.m2.subrole).toBe('MELEE');
    expect(slots.pr.subrole).toBe('PHYS_RANGED');
    expect(slots.c.subrole).toBe('CASTER');

    const jobs = Object.values(slots).map(s => s.job);
    expect(new Set(jobs).size).toBe(8);

    const memberIds = Object.values(slots).map(s => s.member.id);
    expect(new Set(memberIds).size).toBe(8);
  });

  it('no devuelve nada con menos de 8 disponibles', () => {
    const roster = baseRoster().slice(0, 7);
    expect(
      findPartyCombinationsForSlot(DAY, HOUR, availabilityFor(roster), roster, allZero(roster))
    ).toEqual([]);
  });

  it('no devuelve nada si falta el Shield Healer', () => {
    const roster = baseRoster();
    // El Scholar pasa a ser un segundo Pure Healer: quedan 8 personas pero sin escudo.
    roster[3] = member('sh', 'AST');

    expect(
      findPartyCombinationsForSlot(DAY, HOUR, availabilityFor(roster), roster, allZero(roster))
    ).toEqual([]);
  });

  it('respeta la postura del tanque: dos tanques MT no forman party', () => {
    const roster = baseRoster();
    roster[1] = member('ot', 'GNB', { tankStance: 'MT' });

    expect(
      findPartyCombinationsForSlot(DAY, HOUR, availabilityFor(roster), roster, allZero(roster))
    ).toEqual([]);
  });

  it('no repite un job aunque dos miembros lo tengan disponible', () => {
    const roster = [
      ...baseRoster(),
      // Un noveno miembro cuyo único job es el mismo Samurai que ya juega m1.
      member('extra', 'SAM'),
    ];

    const combos = findPartyCombinationsForSlot(
      DAY,
      HOUR,
      availabilityFor(roster),
      roster,
      allZero(roster)
    );

    for (const combo of combos) {
      const jobs = Object.values(combo.slots).map(s => s.job);
      expect(new Set(jobs).size).toBe(8);
    }
  });

  it('prioriza la party de menor progreso aunque aparezca tarde en la búsqueda', () => {
    // Diez miembros: dos casters intercambiables, uno muy avanzado y otro rezagado.
    // El rezagado se declara al final del roster a propósito, que es justo el caso que
    // el corte anterior (las 50 primeras encontradas) podía dejar fuera.
    const roster = [
      ...baseRoster(),
      member('caster_avanzado', 'RDM'),
      member('caster_rezagado', 'SMN'),
    ];

    const progress = progressFor({
      mt: 100,
      ot: 100,
      ph: 100,
      sh: 100,
      m1: 100,
      m2: 100,
      pr: 100,
      c: 400,
      caster_avanzado: 450,
      caster_rezagado: 10,
    });

    const combos = findPartyCombinationsForSlot(
      DAY,
      HOUR,
      availabilityFor(roster),
      roster,
      progress
    );

    expect(combos.length).toBeGreaterThan(0);
    // La party recomendada debe llevar al caster rezagado, no al que ya va sobrado.
    expect(combos[0].slots.c.member.id).toBe('caster_rezagado');
    expect(combos[0].priorityRank).toBe(1);

    // Y el orden global debe ser ascendente por progreso total.
    const scores = combos.map(c => c.totalProgressScore);
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
  });

  it('a igualdad de progreso prefiere la composición con más main jobs', () => {
    // Dos casters con el mismo progreso: uno juega su main, el otro un flex.
    const flexCaster = member('flex_caster', 'DNC', { flexJobs: ['SMN'] });
    const roster = [...baseRoster(), flexCaster];

    const progress = progressFor(
      Object.fromEntries(roster.map(m => [m.id, 0]))
    );

    const combos = findPartyCombinationsForSlot(
      DAY,
      HOUR,
      availabilityFor(roster),
      roster,
      progress
    );

    const top = combos[0];
    expect(top.totalProgressScore).toBe(0);
    // El caster titular ('c', main BLM) debe conservar el puesto frente al flex.
    expect(top.slots.c.isMainJob).toBe(true);
    expect(top.mainJobsCount).toBe(
      Math.max(...combos.filter(c => c.totalProgressScore === 0).map(c => c.mainJobsCount))
    );
  });

  it('no duplica el mismo grupo de 8 con distinto reparto de jobs', () => {
    // El melee m1 puede jugar SAM o MNK: son dos repartos del mismo grupo de personas.
    const roster = baseRoster();
    roster[4] = member('m1', 'SAM', { flexJobs: ['MNK'] });

    const combos = findPartyCombinationsForSlot(
      DAY,
      HOUR,
      availabilityFor(roster),
      roster,
      allZero(roster)
    );

    expect(combos).toHaveLength(1);
  });

  it('permite alternar MT y OT solo cuando ambos tanques juegan las dos posturas', () => {
    const roster = baseRoster();
    roster[0] = member('mt', 'WAR', { tankStance: 'BOTH' });
    roster[1] = member('ot', 'GNB', { tankStance: 'BOTH' });

    const combos = findPartyCombinationsForSlot(
      DAY,
      HOUR,
      availabilityFor(roster),
      roster,
      allZero(roster)
    );

    // Mismo grupo de 8, pero los dos repartos de postura son opciones reales.
    expect(combos).toHaveLength(2);
    const tankPairs = combos.map(c => `${c.slots.mt.member.id}>${c.slots.ot.member.id}`);
    expect(new Set(tankPairs).size).toBe(2);
  });

  it('todos los jobs asignados pertenecen al subrol de su puesto', () => {
    const roster = baseRoster();
    const combos = findPartyCombinationsForSlot(
      DAY,
      HOUR,
      availabilityFor(roster),
      roster,
      allZero(roster)
    );

    for (const combo of combos) {
      for (const slot of Object.values(combo.slots)) {
        expect(FFXIV_JOBS[slot.job].subrole).toBe(slot.subrole);
      }
    }
  });
});

describe('progreso por rol', () => {
  /**
   * Un MCH que también juega SMN: veterano con el phys ranged, casi novato con el
   * caster. Es justo el caso que el progreso general no sabía distinguir.
   */
  function rosterConFlexDesigual() {
    return [...baseRoster(), member('flex_caster', 'MCH', { flexJobs: ['SMN'] })];
  }

  it('valora al miembro por el progreso del rol que ocuparía, no por el general', () => {
    const roster = rosterConFlexDesigual();

    const progress = roleProgressFor({
      ...Object.fromEntries(roster.map(m => [m.id, { general: 0 }])),
      c: { general: 400, byRole: { CASTER: 400 } },
      flex_caster: { general: 450, byRole: { CASTER: 10, PHYS_RANGED: 450 } },
    });

    const combos = findPartyCombinationsForSlot(
      DAY,
      HOUR,
      availabilityFor(roster),
      roster,
      progress
    );

    // Aunque su progreso general (450) es el más alto del roster, de caster va a 10:
    // el puesto de caster es suyo, y el BLM titular (400 de caster) se queda fuera.
    expect(combos[0].slots.c.member.id).toBe('flex_caster');
    expect(combos[0].slots.c.progressScore).toBe(10);
    expect(combos[0].totalProgressScore).toBe(10);
  });

  it('sin progreso por rol el mismo roster prefiere al caster titular', () => {
    const roster = rosterConFlexDesigual();

    // Mismos números, pero en modo unificado: solo cuenta el progreso general.
    const progress = progressFor({
      ...Object.fromEntries(roster.map(m => [m.id, 0])),
      c: 400,
      flex_caster: 450,
    });

    const combos = findPartyCombinationsForSlot(
      DAY,
      HOUR,
      availabilityFor(roster),
      roster,
      progress
    );

    expect(combos[0].slots.c.member.id).toBe('c');
    expect(combos[0].slots.c.progressScore).toBe(400);
  });

  it('los roles sin ajuste propio siguen valiendo el progreso general', () => {
    const roster = rosterConFlexDesigual();

    const progress = roleProgressFor({
      ...Object.fromEntries(roster.map(m => [m.id, { general: 0 }])),
      // Solo ha afinado su progreso de caster; de phys ranged hereda el general.
      flex_caster: { general: 300, byRole: { CASTER: 0 } },
    });

    const combos = findPartyCombinationsForSlot(
      DAY,
      HOUR,
      availabilityFor(roster),
      roster,
      progress
    );

    const conFlexDeCaster = combos.find(c => c.slots.c.member.id === 'flex_caster');
    const conFlexDePr = combos.find(c => c.slots.pr.member.id === 'flex_caster');

    expect(conFlexDeCaster?.slots.c.progressScore).toBe(0);
    expect(conFlexDePr?.slots.pr.progressScore).toBe(300);
  });
});

describe('scanAllViableSlots', () => {
  it('solo devuelve las franjas con party viable', () => {
    const roster = baseRoster();
    const availabilities = [
      ...availabilityFor(roster, 5, 21),
      // Franja con quórum insuficiente: no debe aparecer.
      ...availabilityFor(roster.slice(0, 4), 6, 20),
    ];

    const result = scanAllViableSlots(availabilities, roster, allZero(roster));

    expect(Object.keys(result)).toEqual(['5_21']);
  });

  it('ignora la disponibilidad de miembros dados de baja', () => {
    const roster = baseRoster();
    const availabilities = availabilityFor(roster);
    roster[0] = { ...roster[0], isActive: false };

    expect(scanAllViableSlots(availabilities, roster, allZero(roster))).toEqual({});
  });
});

describe('diagnoseSlot y diagnoseAllNearMissSlots', () => {
  it('1. 7 disponibles con composición perfecta -> FALTAN_PERSONAS, availableCount: 7', () => {
    const roster = baseRoster().slice(0, 7);
    const diag = diagnoseSlot(DAY, HOUR, availabilityFor(roster), roster, allZero(roster));

    expect(diag).not.toBeNull();
    expect(diag?.reason).toBe('FALTAN_PERSONAS');
    expect(diag?.availableCount).toBe(7);
    expect(diag?.missingSlots.length).toBe(1);
    expect(diag?.missingSlots).toContain('C');
  });

  it('2. 9 disponibles sin ningún Shield Healer -> FALTAN_ROLES, missingSlots: [SH]', () => {
    const roster = [
      member('mt', 'WAR', { tankStance: 'MT' }),
      member('ot', 'GNB', { tankStance: 'OT' }),
      member('ph1', 'WHM'),
      member('ph2', 'AST'),
      member('m1', 'SAM'),
      member('m2', 'NIN'),
      member('pr', 'DNC'),
      member('c1', 'BLM'),
      member('c2', 'RDM'),
    ];

    const diag = diagnoseSlot(DAY, HOUR, availabilityFor(roster), roster, allZero(roster));

    expect(diag).not.toBeNull();
    expect(diag?.reason).toBe('FALTAN_ROLES');
    expect(diag?.availableCount).toBe(9);
    expect(diag?.missingSlots).toEqual(['SH']);
  });

  it('3. 8 disponibles donde una sola persona es el único Pure Healer y el único Shield Healer (AST con flex SGE) -> FALTAN_ROLES con un healer sin cubrir', () => {
    const roster = [
      member('mt', 'WAR', { tankStance: 'MT' }),
      member('ot', 'GNB', { tankStance: 'OT' }),
      // Único healer disponible que sabe jugar ambos subroles:
      member('healer-flex', 'AST', { flexJobs: ['SGE'] }),
      member('m1', 'SAM'),
      member('m2', 'NIN'),
      member('pr', 'DNC'),
      member('c1', 'BLM'),
      member('c2', 'SMN'), // Un segundo caster en vez de otro healer
    ];

    const diag = diagnoseSlot(DAY, HOUR, availabilityFor(roster), roster, allZero(roster));

    expect(diag).not.toBeNull();
    expect(diag?.reason).toBe('FALTAN_ROLES');
    expect(diag?.availableCount).toBe(8);
    expect(diag?.missingSlots.length).toBe(1);
    expect(['PH', 'SH']).toContain(diag?.missingSlots[0]);
  });

  it('4. 8 disponibles cuyos dos melees solo tienen SAM -> JOBS_REPETIDOS', () => {
    const roster = [
      member('mt', 'WAR', { tankStance: 'MT' }),
      member('ot', 'GNB', { tankStance: 'OT' }),
      member('ph', 'WHM'),
      member('sh', 'SCH'),
      member('sam1', 'SAM'),
      member('sam2', 'SAM'),
      member('pr', 'DNC'),
      member('c', 'BLM'),
    ];

    const diag = diagnoseSlot(DAY, HOUR, availabilityFor(roster), roster, allZero(roster));

    expect(diag).not.toBeNull();
    expect(diag?.reason).toBe('JOBS_REPETIDOS');
    expect(diag?.availableCount).toBe(8);
    expect(diag?.missingSlots).toEqual([]);
  });

  it('franja con party viable devuelve null (no hay déficit)', () => {
    const roster = baseRoster();
    const diag = diagnoseSlot(DAY, HOUR, availabilityFor(roster), roster, allZero(roster));
    expect(diag).toBeNull();
  });

  it('diagnoseAllNearMissSlots solo incluye franjas con al menos 6 disponibles y las ordena por cercanía', () => {
    const roster = baseRoster();
    const availabilities = [
      // 7 disponibles (a falta de 1)
      ...availabilityFor(roster.slice(0, 7), 5, 21),
      // 6 disponibles (a falta de 2)
      ...availabilityFor(roster.slice(0, 6), 6, 20),
      // 5 disponibles (por debajo del umbral de 6, no debe aparecer)
      ...availabilityFor(roster.slice(0, 5), 0, 18),
    ];

    const results = diagnoseAllNearMissSlots(availabilities, roster, allZero(roster));
    expect(results).toHaveLength(2);
    expect(results[0].availableCount).toBe(7);
    expect(results[0].dayOfWeek).toBe(5);
    expect(results[1].availableCount).toBe(6);
    expect(results[1].dayOfWeek).toBe(6);
  });
});

describe('equidad de rotación y asistencia en el solver', () => {
  it('desempata favoreciendo a miembros con menor asistencia histórica cuando progreso y main jobs empatan', () => {
    // 9 miembros: 2 opciones viables para Caster (BLM1 y BLM2)
    const roster = [
      member('mt', 'WAR', { tankStance: 'MT' }),
      member('ot', 'GNB', { tankStance: 'OT' }),
      member('ph', 'WHM'),
      member('sh', 'SCH'),
      member('m1', 'SAM'),
      member('m2', 'NIN'),
      member('pr', 'DNC'),
      member('c_high_attendance', 'BLM'),
      member('c_low_attendance', 'BLM'),
    ];

    const attendanceMap: Record<string, number> = {
      c_high_attendance: 5,
      c_low_attendance: 1,
    };

    const combos = findPartyCombinationsForSlot(
      DAY,
      HOUR,
      availabilityFor(roster),
      roster,
      allZero(roster),
      attendanceMap
    );

    expect(combos.length).toBeGreaterThanOrEqual(2);
    // La party elegida en primer lugar debe ser la que incluye a c_low_attendance
    expect(combos[0].slots.c.member.id).toBe('c_low_attendance');
    expect(combos[1].slots.c.member.id).toBe('c_high_attendance');
  });
});

