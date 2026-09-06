import { JobId, JobInfo, SubRole, TankStance } from '@/types';

export const FFXIV_JOBS: Record<JobId, JobInfo> = {
  // Tanks (Azul Astral)
  PLD: {
    id: 'PLD',
    name: 'Paladin',
    subrole: 'TANK',
    roleCategory: 'TANK',
    color: '#3b82f6',
    bgGradient: 'from-blue-600/30 to-indigo-950/40',
    iconName: 'Shield',
  },
  WAR: {
    id: 'WAR',
    name: 'Warrior',
    subrole: 'TANK',
    roleCategory: 'TANK',
    color: '#2563eb',
    bgGradient: 'from-blue-700/30 to-slate-950/40',
    iconName: 'Axe',
  },
  DRK: {
    id: 'DRK',
    name: 'Dark Knight',
    subrole: 'TANK',
    roleCategory: 'TANK',
    color: '#1d4ed8',
    bgGradient: 'from-indigo-900/40 to-blue-950/40',
    iconName: 'Sword',
  },
  GNB: {
    id: 'GNB',
    name: 'Gunbreaker',
    subrole: 'TANK',
    roleCategory: 'TANK',
    color: '#60a5fa',
    bgGradient: 'from-sky-600/30 to-indigo-950/40',
    iconName: 'Zap',
  },

  // Pure Healers (Verde Celestial Esmeralda)
  WHM: {
    id: 'WHM',
    name: 'White Mage',
    subrole: 'PURE_HEALER',
    roleCategory: 'HEALER',
    color: '#10b981',
    bgGradient: 'from-emerald-600/30 to-teal-950/40',
    iconName: 'HeartHandshake',
  },
  AST: {
    id: 'AST',
    name: 'Astrologian',
    subrole: 'PURE_HEALER',
    roleCategory: 'HEALER',
    color: '#34d399',
    bgGradient: 'from-teal-600/30 to-emerald-950/40',
    iconName: 'Sparkles',
  },

  // Shield Healers (Verde/Turquesa Éter)
  SCH: {
    id: 'SCH',
    name: 'Scholar',
    subrole: 'SHIELD_HEALER',
    roleCategory: 'HEALER',
    color: '#06b6d4',
    bgGradient: 'from-cyan-600/30 to-teal-950/40',
    iconName: 'BookOpen',
  },
  SGE: {
    id: 'SGE',
    name: 'Sage',
    subrole: 'SHIELD_HEALER',
    roleCategory: 'HEALER',
    color: '#2dd4bf',
    bgGradient: 'from-teal-500/30 to-cyan-950/40',
    iconName: 'Activity',
  },

  // Melee DPS (Rojo Rubí / Magenta)
  MNK: {
    id: 'MNK',
    name: 'Monk',
    subrole: 'MELEE',
    roleCategory: 'DPS',
    color: '#f43f5e',
    bgGradient: 'from-rose-600/30 to-red-950/40',
    iconName: 'Flame',
  },
  DRG: {
    id: 'DRG',
    name: 'Dragoon',
    subrole: 'MELEE',
    roleCategory: 'DPS',
    color: '#ef4444',
    bgGradient: 'from-red-600/30 to-rose-950/40',
    iconName: 'Compass',
  },
  NIN: {
    id: 'NIN',
    name: 'Ninja',
    subrole: 'MELEE',
    roleCategory: 'DPS',
    color: '#dc2626',
    bgGradient: 'from-red-700/30 to-neutral-950/40',
    iconName: 'Wind',
  },
  SAM: {
    id: 'SAM',
    name: 'Samurai',
    subrole: 'MELEE',
    roleCategory: 'DPS',
    color: '#fb7185',
    bgGradient: 'from-rose-500/30 to-red-950/40',
    iconName: 'Moon',
  },
  RPR: {
    id: 'RPR',
    name: 'Reaper',
    subrole: 'MELEE',
    roleCategory: 'DPS',
    color: '#e11d48',
    bgGradient: 'from-rose-800/40 to-slate-950/40',
    iconName: 'Skull',
  },
  VPR: {
    id: 'VPR',
    name: 'Viper',
    subrole: 'MELEE',
    roleCategory: 'DPS',
    color: '#f87171',
    bgGradient: 'from-red-500/30 to-rose-950/40',
    iconName: 'Zap',
  },

  // Physical Ranged DPS (Naranja Dorado / Ocre)
  BRD: {
    id: 'BRD',
    name: 'Bard',
    subrole: 'PHYS_RANGED',
    roleCategory: 'DPS',
    color: '#f59e0b',
    bgGradient: 'from-amber-600/30 to-orange-950/40',
    iconName: 'Music',
  },
  MCH: {
    id: 'MCH',
    name: 'Machinist',
    subrole: 'PHYS_RANGED',
    roleCategory: 'DPS',
    color: '#d97706',
    bgGradient: 'from-amber-700/30 to-yellow-950/40',
    iconName: 'Crosshair',
  },
  DNC: {
    id: 'DNC',
    name: 'Dancer',
    subrole: 'PHYS_RANGED',
    roleCategory: 'DPS',
    color: '#fbbf24',
    bgGradient: 'from-yellow-500/30 to-amber-950/40',
    iconName: 'Sun',
  },

  // Magical Ranged DPS / Caster (Púrpura Místico / Amatista)
  BLM: {
    id: 'BLM',
    name: 'Black Mage',
    subrole: 'CASTER',
    roleCategory: 'DPS',
    color: '#a855f7',
    bgGradient: 'from-purple-600/30 to-violet-950/40',
    iconName: 'Eye',
  },
  SMN: {
    id: 'SMN',
    name: 'Summoner',
    subrole: 'CASTER',
    roleCategory: 'DPS',
    color: '#8b5cf6',
    bgGradient: 'from-violet-600/30 to-purple-950/40',
    iconName: 'Feather',
  },
  RDM: {
    id: 'RDM',
    name: 'Red Mage',
    subrole: 'CASTER',
    roleCategory: 'DPS',
    color: '#c084fc',
    bgGradient: 'from-purple-500/30 to-fuchsia-950/40',
    iconName: 'Sparkle',
  },
  PCT: {
    id: 'PCT',
    name: 'Pictomancer',
    subrole: 'CASTER',
    roleCategory: 'DPS',
    color: '#e879f9',
    bgGradient: 'from-fuchsia-500/30 to-purple-950/40',
    iconName: 'Palette',
  },
};

export const SUBROLE_JOBS: Record<SubRole, JobId[]> = {
  TANK: ['PLD', 'WAR', 'DRK', 'GNB'],
  PURE_HEALER: ['WHM', 'AST'],
  SHIELD_HEALER: ['SCH', 'SGE'],
  MELEE: ['MNK', 'DRG', 'NIN', 'SAM', 'RPR', 'VPR'],
  PHYS_RANGED: ['BRD', 'MCH', 'DNC'],
  CASTER: ['BLM', 'SMN', 'RDM', 'PCT'],
};

export const SUBROLE_LABELS: Record<SubRole, string> = {
  TANK: 'Tank',
  PURE_HEALER: 'Pure Healer',
  SHIELD_HEALER: 'Shield Healer',
  MELEE: 'Melee DPS',
  PHYS_RANGED: 'Phys Ranged DPS',
  CASTER: 'Magical Ranged DPS',
};

export interface PhaseBreakpoint {
  name: string;
  pct: number;
}

export interface PhaseConfig {
  id: number;
  name: string;
  shortName: string;
  color: string;
  breakpoints?: PhaseBreakpoint[];
}

export const UWU_PHASES: PhaseConfig[] = [
  { id: 1, name: 'Fase 1: Garuda', shortName: 'Garuda', color: '#34d399' },
  { id: 2, name: 'Fase 2: Ifrit', shortName: 'Ifrit', color: '#f87171' },
  { id: 3, name: 'Fase 3: Titan', shortName: 'Titan', color: '#fbbf24' },
  { id: 4, name: 'Fase 4: Lahabrea', shortName: 'Lahabrea', color: '#a855f7' },
  {
    id: 5,
    name: 'Fase 5: Ultima Weapon',
    shortName: 'Ultima Weapon',
    color: '#38bdf8',
    breakpoints: [
      { name: 'Ultimate Predation', pct: 60 },
      { name: 'Ultimate Annihilation', pct: 70 },
      { name: 'Ultimate Suppression', pct: 80 },
      { name: 'Primal Roulette', pct: 92 },
    ],
  },
];

/**
 * Normaliza un porcentaje de fase a un entero de 0 a 100.
 *
 * `Math.min(100, Math.max(0, NaN))` devuelve NaN, así que sin este filtro un valor no
 * numérico llegado desde la API contaminaba el score del miembro y el promedio de la FC.
 */
export function clampPhasePct(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(100, Math.max(0, n)));
}

export function calculateOverallScore(p1: number, p2: number, p3: number, p4: number, p5: number): number {
  return (
    clampPhasePct(p1) +
    clampPhasePct(p2) +
    clampPhasePct(p3) +
    clampPhasePct(p4) +
    clampPhasePct(p5)
  );
}

export function getCurrentPhaseName(p1: number, p2: number, p3: number, p4: number, p5: number): string {
  const p5Clamped = clampPhasePct(p5);
  if (p5Clamped >= 100) return '¡Clear / Enrage 100%!';
  if (p5Clamped >= 92) return `Fase 5: Primal Roulette (${p5Clamped}%)`;
  if (p5Clamped >= 80) return `Fase 5: Ultimate Suppression (${p5Clamped}%)`;
  if (p5Clamped >= 70) return `Fase 5: Ultimate Annihilation (${p5Clamped}%)`;
  if (p5Clamped >= 60) return `Fase 5: Ultimate Predation (${p5Clamped}%)`;
  if (p5Clamped > 0) return `Fase 5: Ultima Weapon (${p5Clamped}%)`;
  const p4Clamped = clampPhasePct(p4);
  if (p4Clamped > 0) return `Fase 4: Lahabrea (${p4Clamped}%)`;
  const p3Clamped = clampPhasePct(p3);
  if (p3Clamped > 0) return `Fase 3: Titan (${p3Clamped}%)`;
  const p2Clamped = clampPhasePct(p2);
  if (p2Clamped > 0) return `Fase 2: Ifrit (${p2Clamped}%)`;
  const p1Clamped = clampPhasePct(p1);
  return `Fase 1: Garuda (${p1Clamped}%)`;
}

export function getActiveBreakpoint(phase: PhaseConfig, pct: number): PhaseBreakpoint | null {
  if (!phase.breakpoints || phase.breakpoints.length === 0) return null;
  const clamped = clampPhasePct(pct);
  const sorted = [...phase.breakpoints].sort((a, b) => b.pct - a.pct);
  return sorted.find(bp => clamped >= bp.pct) || null;
}

export function canPlayTankStance(stance: TankStance | null | undefined, requiredStance: 'MT' | 'OT'): boolean {
  if (!stance) return true; // Default fallback if not defined
  if (stance === 'BOTH') return true;
  return stance === requiredStance;
}

/**
 * Normaliza los porcentajes de las 5 fases de UWU.
 *
 * La progresión en UWU es estrictamente secuencial:
 * - Si una fase anterior no está completa (< 100%), ninguna fase posterior puede tener progreso.
 * - Si existen porcentajes incompletos en dos o más fases, se conserva únicamente el progreso
 *   hasta la fase incompleta con menor progreso (la primera incompleta en la secuencia del combate)
 *   y todas las fases posteriores se vacían a 0%.
 */
export function normalizePhaseProgress(
  pcts: [number, number, number, number, number]
): [number, number, number, number, number] {
  const result: [number, number, number, number, number] = [
    clampPhasePct(pcts[0]),
    clampPhasePct(pcts[1]),
    clampPhasePct(pcts[2]),
    clampPhasePct(pcts[3]),
    clampPhasePct(pcts[4]),
  ];

  // En cuanto una fase esté incompleta (< 100%), todas las posteriores quedan en 0%
  for (let i = 0; i < 5; i++) {
    if (result[i] < 100) {
      for (let j = i + 1; j < 5; j++) {
        result[j] = 0;
      }
      break;
    }
  }

  return result;
}

/**
 * Al modificar el progreso de una fase de UWU (1-5):
 * - Las fases anteriores se llenan automáticamente al 100%.
 * - La fase seleccionada toma el nuevo valor acotado (0-100%).
 * - Las fases posteriores se vacían automáticamente a 0%.
 */
export function adjustPhaseProgressOnEdit(
  currentPcts: [number, number, number, number, number],
  phaseId: number,
  newValue: number
): [number, number, number, number, number] {
  const targetIndex = phaseId - 1;
  if (targetIndex < 0 || targetIndex >= 5) {
    return [
      clampPhasePct(currentPcts[0]),
      clampPhasePct(currentPcts[1]),
      clampPhasePct(currentPcts[2]),
      clampPhasePct(currentPcts[3]),
      clampPhasePct(currentPcts[4]),
    ];
  }

  const result: [number, number, number, number, number] = [0, 0, 0, 0, 0];

  // Las fases anteriores se llenan al 100%
  for (let i = 0; i < targetIndex; i++) {
    result[i] = 100;
  }

  // La fase modificada toma el nuevo valor
  result[targetIndex] = clampPhasePct(newValue);

  // Las fases posteriores se vacían al 0%
  for (let i = targetIndex + 1; i < 5; i++) {
    result[i] = 0;
  }

  return result;
}


