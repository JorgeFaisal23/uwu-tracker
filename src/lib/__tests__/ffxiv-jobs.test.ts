import { describe, expect, it } from 'vitest';
import {
  FFXIV_JOBS,
  SUBROLE_JOBS,
  adjustPhaseProgressOnEdit,
  calculateOverallScore,
  clampPhasePct,
  canPlayTankStance,
  getCurrentPhaseName,
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
    expect(clampPhasePct(Infinity)).toBe(0);
    expect(clampPhasePct(null)).toBe(0);
    expect(clampPhasePct(undefined)).toBe(0);
    expect(clampPhasePct({})).toBe(0);
  });

  it('redondea a entero', () => {
    expect(clampPhasePct(66.6)).toBe(67);
    expect(clampPhasePct('42')).toBe(42);
  });
});

describe('calculateOverallScore', () => {
  it('suma las cinco fases sobre 500', () => {
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
  it('nombra la fase más avanzada con progreso', () => {
    expect(getCurrentPhaseName(0, 0, 0, 0, 0)).toContain('Garuda');
    expect(getCurrentPhaseName(100, 80, 0, 0, 0)).toContain('Ifrit');
    expect(getCurrentPhaseName(100, 100, 60, 0, 0)).toContain('Titan');
    expect(getCurrentPhaseName(100, 100, 100, 40, 0)).toContain('Ultima');
    expect(getCurrentPhaseName(100, 100, 100, 100, 20)).toContain('Roulettes');
    expect(getCurrentPhaseName(100, 100, 100, 100, 100)).toContain('Clear');
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

  it('mantiene intacto el progreso de fases posteriores', () => {
    const initial: [number, number, number, number, number] = [100, 50, 40, 10, 0];
    const result = adjustPhaseProgressOnEdit(initial, 2, 80);
    expect(result).toEqual([100, 80, 40, 10, 0]);
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

