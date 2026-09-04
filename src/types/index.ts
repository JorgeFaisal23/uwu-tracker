export type SubRole = 
  | 'TANK' 
  | 'PURE_HEALER' 
  | 'SHIELD_HEALER' 
  | 'MELEE' 
  | 'PHYS_RANGED' 
  | 'CASTER';

export type TankStance = 'MT' | 'OT' | 'BOTH';

export type JobId = 
  // Tanks
  | 'PLD' | 'WAR' | 'DRK' | 'GNB'
  // Pure Healers
  | 'WHM' | 'AST'
  // Shield Healers
  | 'SCH' | 'SGE'
  // Melee DPS
  | 'MNK' | 'DRG' | 'NIN' | 'SAM' | 'RPR' | 'VPR'
  // Physical Ranged DPS
  | 'BRD' | 'MCH' | 'DNC'
  // Magical Ranged DPS (Caster)
  | 'BLM' | 'SMN' | 'RDM' | 'PCT';

export interface JobInfo {
  id: JobId;
  name: string;
  subrole: SubRole;
  roleCategory: 'TANK' | 'HEALER' | 'DPS';
  color: string; // Hex or CSS color
  bgGradient: string;
  iconName: string;
}

export interface Member {
  id: string;
  characterName: string;
  passwordHash: string;
  mainJob: JobId;
  flexJobs: JobId[];
  tankStance: TankStance | null; // For tanks: MT, OT or BOTH
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UwuProgress {
  memberId: string;
  p1GarudaPct: number;    // 0 - 100%
  p2IfritPct: number;     // 0 - 100%
  p3TitanPct: number;     // 0 - 100%
  p4UltimaPct: number;    // 0 - 100%
  p5RoulettePct: number;  // 0 - 100%
  overallScore: number;   // 0 - 500 (sum of all 5 phases)
  currentPhaseName: string;
  updatedAt: string;
}

export interface ProgressHistoryEntry {
  id: string;
  memberId: string;
  characterName: string;
  weekNumber: number;
  year: number;
  p1Pct: number;
  p2Pct: number;
  p3Pct: number;
  p4Pct: number;
  p5Pct: number;
  overallScore: number;
  recordedAt: string;
}

export interface WeeklyFcSnapshot {
  weekNumber: number;
  year: number;
  weekStartDate?: string;
  weekEndDate?: string;
  formattedRange?: string;
  recordedAt: string;
  memberSnapshots: ProgressHistoryEntry[];
  averageScore: number;
  phaseDistribution: {
    garuda: number;
    ifrit: number;
    titan: number;
    ultima: number;
    enrage: number;
    cleared: number;
  };
}

export interface MemberAvailability {
  memberId: string;
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  hourSlot: number;  // 0 a 23 (formato 24 horas)
}

export type SlotRole = 'MT' | 'OT' | 'PH' | 'SH' | 'M1' | 'M2' | 'PR' | 'C';

export interface AssignedPartySlot {
  member: Member;
  job: JobId;
  isMainJob: boolean;
  subrole: SubRole;
  slotRole: SlotRole;
}

export interface SlotDiagnostic {
  dayOfWeek: number;
  hourSlot: number;
  availableCount: number;
  missingSlots: SlotRole[];
  reason: 'FALTAN_PERSONAS' | 'FALTAN_ROLES' | 'JOBS_REPETIDOS';
}


export interface PartyCombination {
  id: string;
  dayOfWeek: number;
  hourSlot: number;
  slots: {
    mt: AssignedPartySlot;
    ot: AssignedPartySlot;
    ph: AssignedPartySlot;
    sh: AssignedPartySlot;
    m1: AssignedPartySlot;
    m2: AssignedPartySlot;
    pr: AssignedPartySlot;
    c: AssignedPartySlot;
  };
  totalProgressScore: number; // Menor score = mayor prioridad (ayudar al más rezagado)
  mainJobsCount: number;      // Mayor cantidad = mayor prioridad en caso de empate
  avgProgressScore: number;
  priorityRank: number;
}

export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export interface ScheduledPartyMember {
  memberId: string;
  characterName: string;
  assignedJob: JobId;
  assignedRole: 'MT' | 'OT' | 'PH' | 'SH' | 'M1' | 'M2' | 'PR' | 'C';
  isMainJob: boolean;
  confirmationStatus: ConfirmationStatus;
  confirmedAt?: string;
}

export interface ScheduledParty {
  id: string;
  scheduledDate: string; // Formato 'YYYY-MM-DD'
  dayOfWeek: number;
  hourSlot: number;
  durationHours: number;
  startTimeLabel: string;
  status: 'ACCEPTED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  notes?: string;
  createdAt: string;
  members: ScheduledPartyMember[];
}

export interface UserSession {
  type: 'ADMIN' | 'MEMBER' | 'GUEST';
  memberId?: string;
  characterName?: string;
}
