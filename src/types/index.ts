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

/**
 * Cómo reparte un miembro su progreso entre los roles que juega.
 *
 * 'UNIFIED' (por defecto) es el comportamiento de siempre: un solo progreso que vale
 * para el main job y para todos los flex. 'PER_ROLE' permite afinar por subrol, porque
 * saber la pelea desde el tanque no es lo mismo que saberla desde el caster.
 */
export type ProgressMode = 'UNIFIED' | 'PER_ROLE';

export interface UwuProgress {
  memberId: string;
  /** null = progreso general: el que se usa para cualquier rol que no tenga el suyo. */
  subrole: SubRole | null;
  p1GarudaPct: number;    // 0 - 100%
  p2IfritPct: number;     // 0 - 100%
  p3TitanPct: number;     // 0 - 100%
  p4UltimaPct: number;    // 0 - 100%
  p5RoulettePct: number;  // 0 - 100%
  overallScore: number;   // 0 - 500 (sum of all 5 phases)
  currentPhaseName: string;
  updatedAt: string;
}

/**
 * Todo el progreso de un miembro: el general y los ajustes por rol.
 *
 * `byRole` solo contiene los roles que el miembro ha editado aparte; cualquier otro
 * hereda `general`, de modo que el progreso general nunca deja de ser la base viva.
 */
export interface MemberProgress {
  memberId: string;
  mode: ProgressMode;
  general: UwuProgress;
  byRole: Partial<Record<SubRole, UwuProgress>>;
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
  /** Progreso del miembro en ESE subrol; es el que suma al total de la party. */
  progressScore: number;
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

export interface PartyVolunteer {
  id: string;
  partyScheduleId?: string | null;
  slotKey?: string | null;
  memberId: string;
  characterName: string;
  assignedJob: JobId;
  assignedRole: string; // SlotRole o rol general (ej. 'TANK', 'HEALER', etc.)
  availabilityNote?: string;
  createdAt: string;
}

export interface PromotedRecruitment {
  id: string;
  slotKey: string; // ej. "1_21"
  dayOfWeek: number;
  hourSlot: number;
  notes?: string;
  missingSlots: SlotRole[];
  status: 'OPEN' | 'CLOSED';
  createdBy: string;
  createdAt: string;
  volunteers?: PartyVolunteer[];
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
  volunteers?: PartyVolunteer[];
}

export interface UserSession {
  type: 'ADMIN' | 'MEMBER' | 'GUEST';
  memberId?: string;
  characterName?: string;
}

/**
 * Invitación de un solo uso para darse de alta.
 *
 * El token en claro no vive aquí ni en la base: solo su hash. Se muestra una única vez,
 * cuando el administrador lo genera.
 */
export interface InviteToken {
  id: string;
  label: string | null;
  createdAt: string;
  expiresAt: string | null;
  usedAt: string | null;
  usedByName: string | null;
  revokedAt: string | null;
  /** Estado derivado, calculado al leer: es lo que se pinta en el panel. */
  status: 'PENDING' | 'USED' | 'EXPIRED' | 'REVOKED';
}
