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

export const UWU_PHASES = [
  { id: 1, name: 'Fase 1: Garuda', shortName: 'Garuda', color: '#34d399' },
  { id: 2, name: 'Fase 2: Ifrit', shortName: 'Ifrit', color: '#f87171' },
  { id: 3, name: 'Fase 3: Titan', shortName: 'Titan', color: '#fbbf24' },
  { id: 4, name: 'Fase 4: The Ultima Weapon', shortName: 'Ultima', color: '#a855f7' },
  { id: 5, name: 'Fase 5: Primal Roulettes / Enrage', shortName: 'Final', color: '#38bdf8' },
];

export function calculateOverallScore(p1: number, p2: number, p3: number, p4: number, p5: number): number {
  return (
    Math.min(100, Math.max(0, p1 || 0)) +
    Math.min(100, Math.max(0, p2 || 0)) +
    Math.min(100, Math.max(0, p3 || 0)) +
    Math.min(100, Math.max(0, p4 || 0)) +
    Math.min(100, Math.max(0, p5 || 0))
  );
}

export function getCurrentPhaseName(p1: number, p2: number, p3: number, p4: number, p5: number): string {
  if (p5 >= 100) return '¡Clear / Enrage 100%!';
  if (p5 > 0) return `Fase 5: Roulettes (${p5}%)`;
  if (p4 > 0) return `Fase 4: Ultima Weapon (${p4}%)`;
  if (p3 > 0) return `Fase 3: Titan (${p3}%)`;
  if (p2 > 0) return `Fase 2: Ifrit (${p2}%)`;
  return `Fase 1: Garuda (${p1 || 0}%)`;
}

export function canPlayTankStance(stance: TankStance | null | undefined, requiredStance: 'MT' | 'OT'): boolean {
  if (!stance) return true; // Default fallback if not defined
  if (stance === 'BOTH') return true;
  return stance === requiredStance;
}
