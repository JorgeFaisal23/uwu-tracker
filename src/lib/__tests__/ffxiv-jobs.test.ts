import { describe, expect, it } from 'vitest';
import {
  FFXIV_JOBS,
  SUBROLE_JOBS,
  UWU_PHASES,
  adjustPhaseProgressOnEdit,
  calculateOverallScore,
  clampPhasePct,
  canPlayTankStance,
  getActiveBreakpoint,
  getCurrentPhaseName,
  normalizePhaseProgress,
} from '../ffxiv-jobs';
import type { JobId } from '@/types';

describe('clampPhasePct', () => {
  it('acota al rango 0-100', () => {
    expect(clampPhasePct(0)).toBe(0);
    expect(clampPhasePct(100)).toBe(100);
    expect(clampPhasePct(-40)).toBe(0);
    expect(clampPhasePct(250)).toBe(100);
  });

  it('convierte a 0 cualquier valor no numérico', () => {
    // Antes, Number('abc') daba NaN y Math.min/max lo propagaba hasta el score.
    expect(clampPhasePct('abc')).toBe(0);
    expect(clampPhasePct(NaN)).toBe(0);
  });

  it('devuelve un entero redondeado', () => {
    expect(clampPhasePct(45.6)).toBe(46);
    expect(clampPhasePct(45.2)).toBe(45);
  });
});

describe('calculateOverallScore', () => {
  it('suma las 5 fases correctamente', () => {
    expect(calculateOverallScore(100, 100, 100, 100, 100)).toBe(500);
    expect(calculateOverallScore(100, 80, 0, 0, 0)).toBe(180);
  });

  it('nunca devuelve NaN con entradas basura', () => {
    const score = calculateOverallScore(
      'abc' as unknown as number,
      NaN,
      undefined as unknown as number,
      100,
      -5
    );
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBe(100);
  });
});

describe('getCurrentPhaseName', () => {
  it('nombra la fase más avanzada con progreso y los breakpoints de la fase 5', () => {
    expect(getCurrentPhaseName(0, 0, 0, 0, 0)).toContain('Garuda');
    expect(getCurrentPhaseName(100, 80, 0, 0, 0)).toContain('Ifrit');
    expect(getCurrentPhaseName(100, 100, 60, 0, 0)).toContain('Titan');
    expect(getCurrentPhaseName(100, 100, 100, 40, 0)).toContain('Lahabrea');
    expect(getCurrentPhaseName(100, 100, 100, 100, 20)).toContain('Ultima Weapon');
    expect(getCurrentPhaseName(100, 100, 100, 100, 60)).toContain('Ultimate Predation');
    expect(getCurrentPhaseName(100, 100, 100, 100, 75)).toContain('Ultimate Annihilation');
    expect(getCurrentPhaseName(100, 100, 100, 100, 85)).toContain('Ultimate Suppression');
    expect(getCurrentPhaseName(100, 100, 100, 100, 95)).toContain('Primal Roulette');
    expect(getCurrentPhaseName(100, 100, 100, 100, 100)).toContain('Clear');
  });
});

describe('getActiveBreakpoint', () => {
  const phase5 = UWU_PHASES.find(p => p.id === 5)!;

  it('devuelve null si no se ha alcanzado ningún breakpoint', () => {
    expect(getActiveBreakpoint(phase5, 0)).toBeNull();
    expect(getActiveBreakpoint(phase5, 59)).toBeNull();
  });

  it('devuelve el breakpoint correspondiente al progreso alcanzado', () => {
    expect(getActiveBreakpoint(phase5, 60)?.name).toBe('Ultimate Predation');
    expect(getActiveBreakpoint(phase5, 69)?.name).toBe('Ultimate Predation');
    expect(getActiveBreakpoint(phase5, 70)?.name).toBe('Ultimate Annihilation');
    expect(getActiveBreakpoint(phase5, 79)?.name).toBe('Ultimate Annihilation');
    expect(getActiveBreakpoint(phase5, 80)?.name).toBe('Ultimate Suppression');
    expect(getActiveBreakpoint(phase5, 91)?.name).toBe('Ultimate Suppression');
    expect(getActiveBreakpoint(phase5, 92)?.name).toBe('Primal Roulette');
    expect(getActiveBreakpoint(phase5, 100)?.name).toBe('Primal Roulette');
  });
});

describe('canPlayTankStance', () => {
  it('BOTH cubre las dos posturas', () => {
    expect(canPlayTankStance('BOTH', 'MT')).toBe(true);
    expect(canPlayTankStance('BOTH', 'OT')).toBe(true);
  });

  it('una postura fija no cubre la otra', () => {
    expect(canPlayTankStance('MT', 'MT')).toBe(true);
    expect(canPlayTankStance('MT', 'OT')).toBe(false);
    expect(canPlayTankStance('OT', 'MT')).toBe(false);
  });

  it('sin postura declarada se asume que puede con ambas', () => {
    expect(canPlayTankStance(null, 'MT')).toBe(true);
    expect(canPlayTankStance(undefined, 'OT')).toBe(true);
  });
});

describe('catálogo de jobs', () => {
  it('SUBROLE_JOBS coincide con el subrol declarado en FFXIV_JOBS', () => {
    for (const [subrole, jobs] of Object.entries(SUBROLE_JOBS)) {
      for (const job of jobs as JobId[]) {
        expect(FFXIV_JOBS[job].subrole).toBe(subrole);
      }
    }
  });

  it('cubre los 21 jobs de combate y no repite ninguno', () => {
    const all = Object.values(SUBROLE_JOBS).flat();
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(Object.keys(FFXIV_JOBS).sort());
  });
});

describe('adjustPhaseProgressOnEdit', () => {
  it('modificar la fase 1 solo cambia la fase 1 sin fases anteriores', () => {
    const initial: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    const result = adjustPhaseProgressOnEdit(initial, 1, 45);
    expect(result).toEqual([45, 0, 0, 0, 0]);
  });

  it('modificar la fase 2 llena la fase 1 al 100%', () => {
    const initial: [number, number, number, number, number] = [20, 0, 0, 0, 0];
    const result = adjustPhaseProgressOnEdit(initial, 2, 60);
    expect(result).toEqual([100, 60, 0, 0, 0]);
  });

  it('modificar la fase 3 llena las fases 1 y 2 al 100%', () => {
    const initial: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    const result = adjustPhaseProgressOnEdit(initial, 3, 30);
    expect(result).toEqual([100, 100, 30, 0, 0]);
  });

  it('modificar la fase 4 llena las fases 1, 2 y 3 al 100%', () => {
    const initial: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    const result = adjustPhaseProgressOnEdit(initial, 4, 75);
    expect(result).toEqual([100, 100, 100, 75, 0]);
  });

  it('modificar la fase 5 llena las fases 1, 2, 3 y 4 al 100%', () => {
    const initial: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    const result = adjustPhaseProgressOnEdit(initial, 5, 100);
    expect(result).toEqual([100, 100, 100, 100, 100]);
  });

  it('vacía automáticamente las fases posteriores al modificar una fase anterior', () => {
    const initial: [number, number, number, number, number] = [100, 50, 40, 10, 0];
    const result = adjustPhaseProgressOnEdit(initial, 2, 80);
    expect(result).toEqual([100, 80, 0, 0, 0]);

    // Modificar la fase 1 vacía las fases 2 a 5
    const fromPhase1 = adjustPhaseProgressOnEdit([100, 80, 0, 0, 0], 1, 45);
    expect(fromPhase1).toEqual([45, 0, 0, 0, 0]);
  });

  it('acota valores fuera de rango (menores a 0 o mayores a 100)', () => {
    const initial: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    expect(adjustPhaseProgressOnEdit(initial, 3, -10)).toEqual([100, 100, 0, 0, 0]);
    expect(adjustPhaseProgressOnEdit(initial, 3, 150)).toEqual([100, 100, 100, 0, 0]);
  });

  it('ignora phaseIds fuera de rango (menores a 1 o mayores a 5)', () => {
    const initial: [number, number, number, number, number] = [10, 20, 30, 40, 50];
    expect(adjustPhaseProgressOnEdit(initial, 0, 99)).toEqual(initial);
    expect(adjustPhaseProgressOnEdit(initial, 6, 99)).toEqual(initial);
  });
});

describe('normalizePhaseProgress', () => {
  it('corrige automáticamente cuando existen porcentajes incompletos en dos fases', () => {
    // Si la fase 2 está al 60% y la fase 3 al 40%, preserva hasta la fase con menor progreso (fase 2)
    const input: [number, number, number, number, number] = [100, 60, 40, 0, 0];
    expect(normalizePhaseProgress(input)).toEqual([100, 60, 0, 0, 0]);
  });

  it('corrige si la fase 1 está incompleta y una fase posterior tiene progreso', () => {
    const input: [number, number, number, number, number] = [45, 60, 0, 0, 0];
    expect(normalizePhaseProgress(input)).toEqual([45, 0, 0, 0, 0]);
  });

  it('corrige cuando existen tres o más fases incompletas', () => {
    const input: [number, number, number, number, number] = [100, 50, 40, 10, 0];
    expect(normalizePhaseProgress(input)).toEqual([100, 50, 0, 0, 0]);
  });

  it('corrige si una fase previa está al 0% y una posterior tiene progreso', () => {
    const input: [number, number, number, number, number] = [100, 0, 50, 0, 0];
    expect(normalizePhaseProgress(input)).toEqual([100, 0, 0, 0, 0]);
  });

  it('mantiene intactos progresos válidos con una sola fase activa', () => {
    expect(normalizePhaseProgress([100, 100, 35, 0, 0])).toEqual([100, 100, 35, 0, 0]);
    expect(normalizePhaseProgress([100, 100, 100, 100, 100])).toEqual([100, 100, 100, 100, 100]);
    expect(normalizePhaseProgress([0, 0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0]);
  });
});


