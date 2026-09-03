import { 
  Member, 
  UwuProgress, 
  MemberAvailability, 
  ScheduledParty, 
  ProgressHistoryEntry,
  WeeklyFcSnapshot,
  JobId,
  TankStance,
  ConfirmationStatus
} from '@/types';
import { calculateOverallScore, getCurrentPhaseName } from './ffxiv-jobs';
import { getNextDateForDayOfWeek, isPartyExpired, isConfirmationWindowOpen } from './date-utils';
import bcrypt from 'bcryptjs';

// Semilla inicial realista de miembros de Lux Obscura
const INITIAL_MEMBERS: Member[] = [
  {
    id: 'mem-1',
    characterName: 'Aria Thorne',
    passwordHash: bcrypt.hashSync('lux123', 10),
    mainJob: 'WAR',
    flexJobs: ['DRK', 'PLD'],
    tankStance: 'MT',
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-2',
    characterName: 'Kaelen Vance',
    passwordHash: bcrypt.hashSync('lux123', 10),
    mainJob: 'GNB',
    flexJobs: ['PLD'],
    tankStance: 'OT',
    isActive: true,
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-3',
    characterName: 'Lyra Moonwhisper',
    passwordHash: bcrypt.hashSync('lux123', 10),
    mainJob: 'WHM',
    flexJobs: ['AST'],
    tankStance: null,
    isActive: true,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-4',
    characterName: 'Rhein Astraea',
    passwordHash: bcrypt.hashSync('lux123', 10),
    mainJob: 'SCH',
    flexJobs: ['SGE'],
    tankStance: null,
    isActive: true,
    createdAt: new Date(Date.now() - 24 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-5',
    characterName: 'Soren Cross',
    passwordHash: bcrypt.hashSync('lux123', 10),
    mainJob: 'RPR',
    flexJobs: ['VPR', 'SAM'],
    tankStance: null,
    isActive: true,
    createdAt: new Date(Date.now() - 22 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-6',
    characterName: 'Nyx Shadowblade',
    passwordHash: bcrypt.hashSync('lux123', 10),
    mainJob: 'NIN',
    flexJobs: ['DRG'],
    tankStance: null,
    isActive: true,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-7',
    characterName: 'Zephyr Bowstring',
    passwordHash: bcrypt.hashSync('lux123', 10),
    mainJob: 'DNC',
    flexJobs: ['BRD', 'MCH'],
    tankStance: null,
    isActive: true,
    createdAt: new Date(Date.now() - 19 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-8',
    characterName: 'Elysia Starfall',
    passwordHash: bcrypt.hashSync('lux123', 10),
    mainJob: 'PCT',
    flexJobs: ['SMN', 'RDM'],
    tankStance: null,
    isActive: true,
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-9',
    characterName: 'Dante Emberheart',
    passwordHash: bcrypt.hashSync('lux123', 10),
    mainJob: 'SAM',
    flexJobs: ['MNK'],
    tankStance: null,
    isActive: true,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-10',
    characterName: 'Sylvie Lunaris',
    passwordHash: bcrypt.hashSync('lux123', 10),
    mainJob: 'AST',
    flexJobs: ['WHM'],
    tankStance: null,
    isActive: true,
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Progreso inicial realista en las 5 fases de UWU
const INITIAL_PROGRESS: Record<string, UwuProgress> = {
  'mem-1': {
    memberId: 'mem-1',
    p1GarudaPct: 100,
    p2IfritPct: 100,
    p3TitanPct: 85,
    p4UltimaPct: 0,
    p5RoulettePct: 0,
    overallScore: 285,
    currentPhaseName: 'Fase 3: Titan (85%)',
    updatedAt: new Date().toISOString(),
  },
  'mem-2': {
    memberId: 'mem-2',
    p1GarudaPct: 100,
    p2IfritPct: 100,
    p3TitanPct: 100,
    p4UltimaPct: 40,
    p5RoulettePct: 0,
    overallScore: 340,
    currentPhaseName: 'Fase 4: Ultima Weapon (40%)',
    updatedAt: new Date().toISOString(),
  },
  'mem-3': {
    memberId: 'mem-3',
    p1GarudaPct: 100,
    p2IfritPct: 80,
    p3TitanPct: 0,
    p4UltimaPct: 0,
    p5RoulettePct: 0,
    overallScore: 180, // Menor progreso (¡prioritario para practicar!)
    currentPhaseName: 'Fase 2: Ifrit (80%)',
    updatedAt: new Date().toISOString(),
  },
  'mem-4': {
    memberId: 'mem-4',
    p1GarudaPct: 100,
    p2IfritPct: 100,
    p3TitanPct: 60,
    p4UltimaPct: 0,
    p5RoulettePct: 0,
    overallScore: 260,
    currentPhaseName: 'Fase 3: Titan (60%)',
    updatedAt: new Date().toISOString(),
  },
  'mem-5': {
    memberId: 'mem-5',
    p1GarudaPct: 100,
    p2IfritPct: 90,
    p3TitanPct: 0,
    p4UltimaPct: 0,
    p5RoulettePct: 0,
    overallScore: 190,
    currentPhaseName: 'Fase 2: Ifrit (90%)',
    updatedAt: new Date().toISOString(),
  },
  'mem-6': {
    memberId: 'mem-6',
    p1GarudaPct: 100,
    p2IfritPct: 100,
    p3TitanPct: 100,
    p4UltimaPct: 30,
    p5RoulettePct: 0,
    overallScore: 330,
    currentPhaseName: 'Fase 4: Ultima Weapon (30%)',
    updatedAt: new Date().toISOString(),
  },
  'mem-7': {
    memberId: 'mem-7',
    p1GarudaPct: 100,
    p2IfritPct: 100,
    p3TitanPct: 95,
    p4UltimaPct: 10,
    p5RoulettePct: 0,
    overallScore: 305,
    currentPhaseName: 'Fase 4: Ultima Weapon (10%)',
    updatedAt: new Date().toISOString(),
  },
  'mem-8': {
    memberId: 'mem-8',
    p1GarudaPct: 100,
    p2IfritPct: 100,
    p3TitanPct: 75,
    p4UltimaPct: 0,
    p5RoulettePct: 0,
    overallScore: 275,
    currentPhaseName: 'Fase 3: Titan (75%)',
    updatedAt: new Date().toISOString(),
  },
  'mem-9': {
    memberId: 'mem-9',
    p1GarudaPct: 100,
    p2IfritPct: 70,
    p3TitanPct: 0,
    p4UltimaPct: 0,
    p5RoulettePct: 0,
    overallScore: 170, // Muy necesitado de progreso
    currentPhaseName: 'Fase 2: Ifrit (70%)',
    updatedAt: new Date().toISOString(),
  },
  'mem-10': {
    memberId: 'mem-10',
    p1GarudaPct: 100,
    p2IfritPct: 100,
    p3TitanPct: 100,
    p4UltimaPct: 70,
    p5RoulettePct: 20,
    overallScore: 390,
    currentPhaseName: 'Fase 5: Roulettes (20%)',
    updatedAt: new Date().toISOString(),
  },
};

// Disponibilidad semanal inicial (Viernes y Sábado en la noche coinciden 8+ miembros)
const INITIAL_AVAILABILITY: MemberAvailability[] = [];
// Viernes 21:00 y 22:00 CDMX (Día 5 = Viernes, horas 21 y 22)
// Sábado 20:00 y 21:00 CDMX (Día 6 = Sábado, horas 20 y 21)
const activeDays = [
  { day: 5, hours: [20, 21, 22] }, // Viernes
  { day: 6, hours: [19, 20, 21, 22] }, // Sábado
  { day: 0, hours: [20, 21] }, // Domingo
];

for (const m of INITIAL_MEMBERS) {
  for (const ad of activeDays) {
    for (const h of ad.hours) {
      INITIAL_AVAILABILITY.push({
        memberId: m.id,
        dayOfWeek: ad.day,
        hourSlot: h,
      });
    }
  }
}

// Historial semanal simulado para la FC (Semana 1, 2 y 3)
const INITIAL_SNAPSHOTS: WeeklyFcSnapshot[] = [
  {
    weekNumber: 1,
    year: 2026,
    recordedAt: '2026-08-18T20:00:00.000Z',
    averageScore: 90,
    phaseDistribution: { garuda: 8, ifrit: 2, titan: 0, ultima: 0, enrage: 0, cleared: 0 },
    memberSnapshots: INITIAL_MEMBERS.map(m => ({
      id: `snap-1-${m.id}`,
      memberId: m.id,
      characterName: m.characterName,
      weekNumber: 1,
      year: 2026,
      p1Pct: 90,
      p2Pct: 0,
      p3Pct: 0,
      p4Pct: 0,
      p5Pct: 0,
      overallScore: 90,
      recordedAt: '2026-08-18T20:00:00.000Z',
    })),
  },
  {
    weekNumber: 2,
    year: 2026,
    recordedAt: '2026-08-25T20:00:00.000Z',
    averageScore: 185,
    phaseDistribution: { garuda: 1, ifrit: 7, titan: 2, ultima: 0, enrage: 0, cleared: 0 },
    memberSnapshots: INITIAL_MEMBERS.map(m => ({
      id: `snap-2-${m.id}`,
      memberId: m.id,
      characterName: m.characterName,
      weekNumber: 2,
      year: 2026,
      p1Pct: 100,
      p2Pct: 85,
      p3Pct: 0,
      p4Pct: 0,
      p5Pct: 0,
      overallScore: 185,
      recordedAt: '2026-08-25T20:00:00.000Z',
    })),
  },
  {
    weekNumber: 3,
    year: 2026,
    recordedAt: '2026-09-01T20:00:00.000Z',
    averageScore: 273,
    phaseDistribution: { garuda: 0, ifrit: 2, titan: 5, ultima: 2, enrage: 1, cleared: 0 },
    memberSnapshots: INITIAL_MEMBERS.map(m => {
      const p = INITIAL_PROGRESS[m.id];
      return {
        id: `snap-3-${m.id}`,
        memberId: m.id,
        characterName: m.characterName,
        weekNumber: 3,
        year: 2026,
        p1Pct: p.p1GarudaPct,
        p2Pct: p.p2IfritPct,
        p3Pct: p.p3TitanPct,
        p4Pct: p.p4UltimaPct,
        p5Pct: p.p5RoulettePct,
        overallScore: p.overallScore,
        recordedAt: '2026-09-01T20:00:00.000Z',
      };
    }),
  },
];

// Una party oficial ya aceptada por el Admin para el próximo Viernes a las 21:00
const nextFridayDate = getNextDateForDayOfWeek(5, 21);

const INITIAL_SCHEDULED_PARTIES: ScheduledParty[] = [
  {
    id: 'sched-1',
    scheduledDate: nextFridayDate,
    dayOfWeek: 5, // Viernes
    hourSlot: 21, // 21:00 CDMX
    durationHours: 2,
    startTimeLabel: 'Viernes 21:00 CDMX',
    status: 'ACCEPTED',
    notes: 'Incursión Oficial Lux Obscura - Enfoque en progresión de Fase 3 Titan y transición a Ultima',
    createdAt: new Date().toISOString(),
    members: [
      { memberId: 'mem-1', characterName: 'Aria Thorne', assignedJob: 'WAR', assignedRole: 'MT', isMainJob: true, confirmationStatus: 'CONFIRMED', confirmedAt: new Date().toISOString() },
      { memberId: 'mem-2', characterName: 'Kaelen Vance', assignedJob: 'GNB', assignedRole: 'OT', isMainJob: true, confirmationStatus: 'CONFIRMED', confirmedAt: new Date().toISOString() },
      { memberId: 'mem-3', characterName: 'Lyra Moonwhisper', assignedJob: 'WHM', assignedRole: 'PH', isMainJob: true, confirmationStatus: 'PENDING' },
      { memberId: 'mem-4', characterName: 'Rhein Astraea', assignedJob: 'SCH', assignedRole: 'SH', isMainJob: true, confirmationStatus: 'CONFIRMED', confirmedAt: new Date().toISOString() },
      { memberId: 'mem-9', characterName: 'Dante Emberheart', assignedJob: 'SAM', assignedRole: 'M1', isMainJob: true, confirmationStatus: 'PENDING' },
      { memberId: 'mem-6', characterName: 'Nyx Shadowblade', assignedJob: 'NIN', assignedRole: 'M2', isMainJob: true, confirmationStatus: 'CONFIRMED', confirmedAt: new Date().toISOString() },
      { memberId: 'mem-7', characterName: 'Zephyr Bowstring', assignedJob: 'DNC', assignedRole: 'PR', isMainJob: true, confirmationStatus: 'PENDING' },
      { memberId: 'mem-8', characterName: 'Elysia Starfall', assignedJob: 'PCT', assignedRole: 'C', isMainJob: true, confirmationStatus: 'CONFIRMED', confirmedAt: new Date().toISOString() },
    ],
  },
];

// Estado en memoria que persiste durante la ejecución de la app
let membersStore: Member[] = [...INITIAL_MEMBERS];
let progressStore: Record<string, UwuProgress> = { ...INITIAL_PROGRESS };
let availabilityStore: MemberAvailability[] = [...INITIAL_AVAILABILITY];
let weeklySnapshotsStore: WeeklyFcSnapshot[] = [...INITIAL_SNAPSHOTS];
let scheduledPartiesStore: ScheduledParty[] = [...INITIAL_SCHEDULED_PARTIES];

export class StorageService {
  // --- Miembros ---
  static getMembers(): Member[] {
    return membersStore.filter(m => m.isActive);
  }

  static getMemberById(id: string): Member | undefined {
    return membersStore.find(m => m.id === id && m.isActive);
  }

  static getMemberByName(name: string): Member | undefined {
    return membersStore.find(
      m => m.characterName.toLowerCase() === name.trim().toLowerCase() && m.isActive
    );
  }

  static async registerMember(data: {
    characterName: string;
    passwordPlain: string;
    mainJob: JobId;
    flexJobs?: JobId[];
    tankStance?: TankStance | null;
  }): Promise<Member> {
    const existing = this.getMemberByName(data.characterName);
    if (existing) {
      throw new Error('Ya existe un miembro registrado con ese nombre de personaje.');
    }

    const passwordHash = await bcrypt.hash(data.passwordPlain, 10);
    const newMember: Member = {
      id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      characterName: data.characterName.trim(),
      passwordHash,
      mainJob: data.mainJob,
      flexJobs: data.flexJobs || [],
      tankStance: data.tankStance || null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    membersStore.push(newMember);

    // Inicializar progreso en 0
    progressStore[newMember.id] = {
      memberId: newMember.id,
      p1GarudaPct: 0,
      p2IfritPct: 0,
      p3TitanPct: 0,
      p4UltimaPct: 0,
      p5RoulettePct: 0,
      overallScore: 0,
      currentPhaseName: 'Fase 1: Garuda (0%)',
      updatedAt: new Date().toISOString(),
    };

    return newMember;
  }

  static async updateMemberProfile(
    id: string,
    data: {
      mainJob?: JobId;
      flexJobs?: JobId[];
      tankStance?: TankStance | null;
      newPasswordPlain?: string;
    }
  ): Promise<Member> {
    const member = membersStore.find(m => m.id === id);
    if (!member) throw new Error('Miembro no encontrado.');

    if (data.mainJob) member.mainJob = data.mainJob;
    if (data.flexJobs !== undefined) member.flexJobs = data.flexJobs;
    if (data.tankStance !== undefined) member.tankStance = data.tankStance;
    if (data.newPasswordPlain) {
      member.passwordHash = await bcrypt.hash(data.newPasswordPlain, 10);
    }
    member.updatedAt = new Date().toISOString();

    return member;
  }

  static deleteMember(id: string): void {
    const idx = membersStore.findIndex(m => m.id === id);
    if (idx !== -1) {
      membersStore[idx].isActive = false;
    }
  }

  static async resetMemberPassword(id: string, newPasswordPlain: string): Promise<void> {
    const member = membersStore.find(m => m.id === id);
    if (!member) throw new Error('Miembro no encontrado.');
    member.passwordHash = await bcrypt.hash(newPasswordPlain, 10);
    member.updatedAt = new Date().toISOString();
  }

  // --- Progreso UWU ---
  static getProgressMap(): Record<string, UwuProgress> {
    return { ...progressStore };
  }

  static getProgressByMemberId(memberId: string): UwuProgress {
    return (
      progressStore[memberId] || {
        memberId,
        p1GarudaPct: 0,
        p2IfritPct: 0,
        p3TitanPct: 0,
        p4UltimaPct: 0,
        p5RoulettePct: 0,
        overallScore: 0,
        currentPhaseName: 'Fase 1: Garuda (0%)',
        updatedAt: new Date().toISOString(),
      }
    );
  }

  static updateProgress(
    memberId: string,
    p1: number,
    p2: number,
    p3: number,
    p4: number,
    p5: number
  ): UwuProgress {
    const overallScore = calculateOverallScore(p1, p2, p3, p4, p5);
    const currentPhaseName = getCurrentPhaseName(p1, p2, p3, p4, p5);

    const updated: UwuProgress = {
      memberId,
      p1GarudaPct: Math.min(100, Math.max(0, p1)),
      p2IfritPct: Math.min(100, Math.max(0, p2)),
      p3TitanPct: Math.min(100, Math.max(0, p3)),
      p4UltimaPct: Math.min(100, Math.max(0, p4)),
      p5RoulettePct: Math.min(100, Math.max(0, p5)),
      overallScore,
      currentPhaseName,
      updatedAt: new Date().toISOString(),
    };

    progressStore[memberId] = updated;
    return updated;
  }

  // --- Disponibilidad ---
  static getAvailabilities(): MemberAvailability[] {
    return [...availabilityStore];
  }

  static getMemberAvailability(memberId: string): MemberAvailability[] {
    return availabilityStore.filter(a => a.memberId === memberId);
  }

  static setMemberAvailability(
    memberId: string,
    slots: { dayOfWeek: number; hourSlot: number }[]
  ): void {
    // Remover disponibilidad previa del miembro
    availabilityStore = availabilityStore.filter(a => a.memberId !== memberId);
    // Insertar nuevas
    for (const s of slots) {
      availabilityStore.push({
        memberId,
        dayOfWeek: s.dayOfWeek,
        hourSlot: s.hourSlot,
      });
    }
  }

  // --- Parties Agendadas / Oficializadas por Admin ---
  /**
   * Obtiene las parties oficiales.
   * Si includePast es false (por defecto), solo retorna parties vigentes cuyo día y horario no han pasado.
   */
  static getScheduledParties(includePast: boolean = false): ScheduledParty[] {
    if (includePast) {
      return [...scheduledPartiesStore];
    }
    return scheduledPartiesStore.filter(p => p.status === 'ACCEPTED' && !isPartyExpired(p));
  }

  /**
   * Obtiene el histórico de parties pasadas o concluidas.
   */
  static getPastParties(): ScheduledParty[] {
    return scheduledPartiesStore.filter(p => isPartyExpired(p) || p.status === 'COMPLETED');
  }

  static scheduleParty(party: Omit<ScheduledParty, 'id' | 'createdAt'>): ScheduledParty {
    // Asegurar que cada miembro tenga confirmationStatus
    const membersWithConfirmation = party.members.map(m => ({
      ...m,
      confirmationStatus: m.confirmationStatus || 'PENDING',
    }));

    const newScheduled: ScheduledParty = {
      ...party,
      members: membersWithConfirmation,
      id: `sched-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    scheduledPartiesStore.unshift(newScheduled);
    return newScheduled;
  }

  static confirmPartyAttendance(
    partyId: string,
    memberId: string,
    status: ConfirmationStatus,
    isAdminOverride: boolean = false
  ): { success: boolean; party?: ScheduledParty; message?: string } {
    const party = scheduledPartiesStore.find(p => p.id === partyId);
    if (!party) {
      return { success: false, message: 'Party no encontrada.' };
    }

    // Si no es override de admin, validar la ventana de 5 horas
    if (!isAdminOverride) {
      const isWindowOpen = isConfirmationWindowOpen(party.scheduledDate, party.hourSlot, 5);
      if (!isWindowOpen) {
        return {
          success: false,
          message: 'El plazo límite de confirmación (5 horas antes del inicio) ha vencido.',
        };
      }
    }

    const member = party.members.find(m => m.memberId === memberId);
    if (!member) {
      return { success: false, message: 'El miembro no está asignado a esta party.' };
    }

    member.confirmationStatus = status;
    member.confirmedAt = status === 'CONFIRMED' ? new Date().toISOString() : undefined;

    return { success: true, party };
  }

  static cancelScheduledParty(id: string): void {
    const party = scheduledPartiesStore.find(p => p.id === id);
    if (party) {
      party.status = 'CANCELLED';
    }
  }

  // --- Histórico Semanal (Opción A: Snapshot) ---
  static getWeeklySnapshots(): WeeklyFcSnapshot[] {
    return [...weeklySnapshotsStore].sort((a, b) => b.weekNumber - a.weekNumber);
  }

  static createWeeklySnapshot(): WeeklyFcSnapshot {
    const currentWeekNum = weeklySnapshotsStore.length + 1;
    const activeMembers = this.getMembers();

    let totalScore = 0;
    const phaseDistribution = {
      garuda: 0,
      ifrit: 0,
      titan: 0,
      ultima: 0,
      enrage: 0,
      cleared: 0,
    };

    const memberSnapshots: ProgressHistoryEntry[] = activeMembers.map(m => {
      const p = this.getProgressByMemberId(m.id);
      totalScore += p.overallScore;

      if (p.p5RoulettePct >= 100) phaseDistribution.cleared++;
      else if (p.p5RoulettePct > 0) phaseDistribution.enrage++;
      else if (p.p4UltimaPct > 0) phaseDistribution.ultima++;
      else if (p.p3TitanPct > 0) phaseDistribution.titan++;
      else if (p.p2IfritPct > 0) phaseDistribution.ifrit++;
      else phaseDistribution.garuda++;

      return {
        id: `snap-${currentWeekNum}-${m.id}`,
        memberId: m.id,
        characterName: m.characterName,
        weekNumber: currentWeekNum,
        year: 2026,
        p1Pct: p.p1GarudaPct,
        p2Pct: p.p2IfritPct,
        p3Pct: p.p3TitanPct,
        p4Pct: p.p4UltimaPct,
        p5Pct: p.p5RoulettePct,
        overallScore: p.overallScore,
        recordedAt: new Date().toISOString(),
      };
    });

    const averageScore = Math.round(
      activeMembers.length > 0 ? totalScore / activeMembers.length : 0
    );

    const snapshot: WeeklyFcSnapshot = {
      weekNumber: currentWeekNum,
      year: 2026,
      recordedAt: new Date().toISOString(),
      memberSnapshots,
      averageScore,
      phaseDistribution,
    };

    weeklySnapshotsStore.unshift(snapshot);
    return snapshot;
  }
}
