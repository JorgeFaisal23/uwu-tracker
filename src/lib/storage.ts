import 'server-only';

import {
  ConfirmationStatus,
  JobId,
  Member,
  MemberAvailability,
  MemberProgress,
  ProgressHistoryEntry,
  ProgressMode,
  ScheduledParty,
  ScheduledPartyMember,
  SubRole,
  TankStance,
  UwuProgress,
  WeeklyFcSnapshot,
  InviteToken,
  PartyVolunteer,
  PromotedRecruitment,
  SlotRole,
} from '@/types';
import { calculateOverallScore, clampPhasePct, normalizePhaseProgress } from './ffxiv-jobs';
import {
  buildProgress,
  emptyMemberProgress,
  emptyProgress,
  memberDisplayProgress,
} from './progress';
import {
  getCalendarWeek,
  getCalendarWeekRange,
  isConfirmationWindowOpen,
  isPartyExpired,
} from './date-utils';
import { getSupabase, unwrap } from './supabase';
import { ApiError, AuthError } from './errors';
import { generateInviteToken, hashInviteToken } from './auth';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// --- Filas tal como viven en PostgreSQL ------------------------------------

interface MemberRow {
  id: string;
  character_name: string;
  password_hash: string;
  main_job: string;
  flex_jobs: string[] | null;
  tank_stance: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProgressRow {
  member_id: string;
  p1_garuda_pct: number;
  p2_ifrit_pct: number;
  p3_titan_pct: number;
  p4_ultima_pct: number;
  p5_roulette_pct: number;
  overall_score: number;
  progress_mode: string | null;
  updated_at: string;
}

interface RoleProgressRow {
  member_id: string;
  subrole: string;
  p1_garuda_pct: number;
  p2_ifrit_pct: number;
  p3_titan_pct: number;
  p4_ultima_pct: number;
  p5_roulette_pct: number;
  overall_score: number;
  updated_at: string;
}

interface AvailabilityRow {
  member_id: string;
  day_of_week: number;
  hour_slot: number;
}

interface HistoryRow {
  id: string;
  member_id: string;
  character_name: string;
  week_number: number;
  year: number;
  p1_pct: number;
  p2_pct: number;
  p3_pct: number;
  p4_pct: number;
  p5_pct: number;
  overall_score: number;
  recorded_at: string;
}

interface PartyMemberRow {
  member_id: string;
  character_name: string;
  assigned_job: string;
  assigned_role: string;
  is_main_job: boolean;
  confirmation_status: string;
  confirmed_at: string | null;
}

interface PartyRow {
  id: string;
  scheduled_date: string;
  day_of_week: number;
  hour_slot: number;
  duration_hours: number;
  start_time_label: string;
  status: string;
  notes: string | null;
  created_at: string;
  party_schedule_members: PartyMemberRow[] | null;
}

interface InviteTokenRow {
  id: string;
  label: string | null;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_by_member_id: string | null;
  used_by_name: string | null;
  revoked_at: string | null;
}

interface VolunteerRow {
  id: string;
  party_schedule_id: string | null;
  slot_key: string | null;
  member_id: string;
  character_name: string;
  assigned_job: string;
  assigned_role: string;
  availability_note: string | null;
  created_at: string;
}

interface PromotedRecruitmentRow {
  id: string;
  slot_key: string;
  day_of_week: number;
  hour_slot: number;
  notes: string | null;
  missing_slots: string[] | null;
  status: string;
  created_by: string;
  created_at: string;
}

const PARTY_SELECT = '*, party_schedule_members(*)';

// Almacenamiento en memoria provisional por si el script SQL no ha corrido en Supabase
const inMemoryVolunteers = new Map<string, PartyVolunteer>();
const inMemoryPromoted = new Map<string, PromotedRecruitment>();

// --- Traducción fila <-> dominio -------------------------------------------

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    characterName: row.character_name,
    passwordHash: row.password_hash,
    mainJob: row.main_job as JobId,
    flexJobs: (row.flex_jobs ?? []) as JobId[],
    tankStance: row.tank_stance as TankStance | null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * `overallScore` y `currentPhaseName` se derivan al leer, nunca se guardan a mano: como
 * columnas podían quedar desincronizadas de los porcentajes de su propia fila.
 */
function toProgress(row: ProgressRow | RoleProgressRow, subrole: SubRole | null): UwuProgress {
  return buildProgress(
    row.member_id,
    subrole,
    [
      row.p1_garuda_pct,
      row.p2_ifrit_pct,
      row.p3_titan_pct,
      row.p4_ultima_pct,
      row.p5_roulette_pct,
    ],
    row.updated_at
  );
}

/**
 * Distingue "la tabla de progreso por rol todavía no existe" de un fallo real.
 *
 * El código se despliega antes de que nadie ejecute `scripts/role-progress.sql`. Sin
 * esto, ese intervalo tumbaría el roster y el buscador de parties enteros; con esto,
 * la aplicación sigue funcionando con el progreso general, que es justo lo que había
 * antes de esta función.
 */
function missingRoleProgressTable(error: { code?: string; message?: string } | null): boolean {
  return missingTableError(error, 'member_role_progress');
}

function missingTableError(error: { code?: string; message?: string } | null, tableName: string): boolean {
  if (!error) return false;

  const missing = error.code === '42P01' || error.code === 'PGRST205';

  if (missing) {
    console.warn(
      `[storage] Falta la tabla ${tableName}; se usa almacenamiento provisional. ` +
        `Ejecuta el script SQL correspondiente en Supabase.`
    );
  }

  return missing;
}

function toProgressMode(value: string | null | undefined): ProgressMode {
  return value === 'PER_ROLE' ? 'PER_ROLE' : 'UNIFIED';
}

/**
 * Junta la fila de progreso general con los ajustes por rol de un mismo miembro.
 *
 * Un miembro puede no tener ninguna de las dos cosas (alta recién hecha, o progreso por
 * rol guardado antes de que existiera su fila general): en ambos casos sale un progreso
 * en cero en modo unificado, que es el comportamiento de siempre.
 */
function toMemberProgress(
  memberId: string,
  generalRow: ProgressRow | undefined,
  roleRows: RoleProgressRow[]
): MemberProgress {
  const byRole: Partial<Record<SubRole, UwuProgress>> = {};

  for (const row of roleRows) {
    byRole[row.subrole as SubRole] = toProgress(row, row.subrole as SubRole);
  }

  return {
    memberId,
    mode: toProgressMode(generalRow?.progress_mode),
    general: generalRow ? toProgress(generalRow, null) : emptyProgress(memberId),
    byRole,
  };
}

function toScheduledParty(row: PartyRow, volunteers: PartyVolunteer[] = []): ScheduledParty {
  return {
    id: row.id,
    scheduledDate: row.scheduled_date,
    dayOfWeek: row.day_of_week,
    hourSlot: row.hour_slot,
    durationHours: row.duration_hours,
    startTimeLabel: row.start_time_label,
    status: row.status as ScheduledParty['status'],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    members: (row.party_schedule_members ?? []).map(m => ({
      memberId: m.member_id,
      characterName: m.character_name,
      assignedJob: m.assigned_job as JobId,
      assignedRole: m.assigned_role as ScheduledPartyMember['assignedRole'],
      isMainJob: m.is_main_job,
      confirmationStatus: m.confirmation_status as ConfirmationStatus,
      confirmedAt: m.confirmed_at ?? undefined,
    })),
    volunteers,
  };
}

function toPartyVolunteer(row: VolunteerRow): PartyVolunteer {
  return {
    id: row.id,
    partyScheduleId: row.party_schedule_id,
    slotKey: row.slot_key,
    memberId: row.member_id,
    characterName: row.character_name,
    assignedJob: row.assigned_job as JobId,
    assignedRole: row.assigned_role,
    availabilityNote: row.availability_note ?? undefined,
    createdAt: row.created_at,
  };
}

function toPromotedRecruitment(
  row: PromotedRecruitmentRow,
  volunteers: PartyVolunteer[] = []
): PromotedRecruitment {
  return {
    id: row.id,
    slotKey: row.slot_key,
    dayOfWeek: row.day_of_week,
    hourSlot: row.hour_slot,
    notes: row.notes ?? undefined,
    missingSlots: (row.missing_slots ?? []) as SlotRole[],
    status: row.status === 'CLOSED' ? 'CLOSED' : 'OPEN',
    createdBy: row.created_by,
    createdAt: row.created_at,
    volunteers,
  };
}

function toHistoryEntry(row: HistoryRow): ProgressHistoryEntry {
  return {
    id: row.id,
    memberId: row.member_id,
    characterName: row.character_name,
    weekNumber: row.week_number,
    year: row.year,
    p1Pct: row.p1_pct,
    p2Pct: row.p2_pct,
    p3Pct: row.p3_pct,
    p4Pct: row.p4_pct,
    p5Pct: row.p5_pct,
    overallScore: row.overall_score,
    recordedAt: row.recorded_at,
  };
}

/**
 * El estado no se guarda como columna: se deriva al leer, para que no pueda quedar
 * desincronizado de las fechas que realmente lo determinan (igual que `overall_score`
 * o `currentPhaseName`).
 */
function toInviteToken(row: InviteTokenRow): InviteToken {
  const status: InviteToken['status'] =
    row.revoked_at ? 'REVOKED'
    : row.used_at ? 'USED'
    : row.expires_at && new Date(row.expires_at) <= new Date() ? 'EXPIRED'
    : 'PENDING';

  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    usedByName: row.used_by_name,
    revokedAt: row.revoked_at,
    status,
  };
}

// --- Servicio ---------------------------------------------------------------

/**
 * Acceso a datos de la aplicación.
 *
 * Antes era estado en memoria del módulo: se perdía en cada reinicio y, en un despliegue
 * serverless, cada instancia tenía su propia copia, de modo que dos miembros podían ver
 * datos distintos. Ahora todo vive en Supabase.
 */
export class StorageService {
  // --- Miembros ---

  /** Miembros activos, ordenados por nombre. */
  static async getMembers(): Promise<Member[]> {
    const rows = unwrap<MemberRow[]>(
      await getSupabase()
        .from('members')
        .select('*')
        .eq('is_active', true)
        .order('character_name'),
      'getMembers'
    );

    return rows.map(toMember);
  }

  static async getMemberById(id: string): Promise<Member | undefined> {
    const { data, error } = await getSupabase()
      .from('members')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[storage] getMemberById:', error);
      throw new Error('Error de base de datos en getMemberById');
    }

    return data ? toMember(data as MemberRow) : undefined;
  }

  /**
   * Si el miembro sigue de alta. Es lo que consulta cada petición autenticada, así que
   * pide solo el id en vez de la fila entera.
   *
   * `deleteMember` es una baja lógica (`is_active = false`) para no romper el histórico
   * ni las parties pasadas. Sin esta comprobación la cookie firmada seguía siendo válida
   * hasta su caducidad —siete días— y quien acabara de ser expulsado conservaba permiso
   * de escritura sobre su progreso y su disponibilidad.
   */
  static async isMemberActive(id: string): Promise<boolean> {
    const { data, error } = await getSupabase()
      .from('members')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[storage] isMemberActive:', error);
      throw new Error('Error de base de datos en isMemberActive');
    }

    return data !== null;
  }

  static async getMemberByName(name: string): Promise<Member | undefined> {
    const { data, error } = await getSupabase()
      .from('members')
      .select('*')
      // ilike sin comodines compara sin distinguir mayúsculas, igual que el índice único.
      .ilike('character_name', name.trim())
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[storage] getMemberByName:', error);
      throw new Error('Error de base de datos en getMemberByName');
    }

    return data ? toMember(data as MemberRow) : undefined;
  }

  static async registerMember(data: {
    characterName: string;
    passwordPlain: string;
    mainJob: JobId;
    flexJobs?: JobId[];
    tankStance?: TankStance | null;
  }): Promise<Member> {
    const supabase = getSupabase();
    const passwordHash = await bcrypt.hash(data.passwordPlain, SALT_ROUNDS);

    const { data: inserted, error } = await supabase
      .from('members')
      .insert({
        character_name: data.characterName.trim(),
        password_hash: passwordHash,
        main_job: data.mainJob,
        flex_jobs: data.flexJobs ?? [],
        tank_stance: data.tankStance ?? null,
      })
      .select('*')
      .single();

    if (error) {
      // 23505 = violación de unicidad. Es el caso esperado, no un fallo del sistema.
      if (error.code === '23505') {
        throw new ApiError('Ya existe un miembro registrado con ese nombre de personaje.', 409);
      }
      console.error('[storage] registerMember:', error);
      throw new Error('Error de base de datos en registerMember');
    }

    const member = toMember(inserted as MemberRow);

    // Fila de progreso en cero, para que el miembro aparezca en el roster desde el minuto uno.
    const { error: progressError } = await supabase
      .from('member_progress')
      .insert({ member_id: member.id });

    if (progressError) {
      console.error('[storage] registerMember (progreso inicial):', progressError);
    }

    return member;
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
    // El esquema solo valida lo que trae la petición. Si llegan flex jobs sin main job,
    // la comprobación "un job no es principal y secundario a la vez" necesita el valor
    // ya guardado, así que se resuelve aquí sobre el estado combinado.
    if (data.flexJobs && data.mainJob === undefined) {
      const current = await this.getMemberById(id);
      if (!current) throw new ApiError('Miembro no encontrado.', 404);

      if (data.flexJobs.includes(current.mainJob)) {
        throw new ApiError('El main job no puede figurar también como flex job.', 400);
      }
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (data.mainJob !== undefined) patch.main_job = data.mainJob;
    if (data.flexJobs !== undefined) patch.flex_jobs = data.flexJobs;
    if (data.tankStance !== undefined) patch.tank_stance = data.tankStance;
    if (data.newPasswordPlain) {
      patch.password_hash = await bcrypt.hash(data.newPasswordPlain, SALT_ROUNDS);
    }

    const { data: updated, error } = await getSupabase()
      .from('members')
      .update(patch)
      .eq('id', id)
      .eq('is_active', true)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[storage] updateMemberProfile:', error);
      throw new Error('Error de base de datos en updateMemberProfile');
    }
    if (!updated) throw new ApiError('Miembro no encontrado.', 404);

    return toMember(updated as MemberRow);
  }

  /** Baja lógica: se conserva la fila para no romper el histórico ni las parties pasadas. */
  static async deleteMember(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('members')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[storage] deleteMember:', error);
      throw new Error('Error de base de datos en deleteMember');
    }
  }

  static async resetMemberPassword(id: string, newPasswordPlain: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPasswordPlain, SALT_ROUNDS);

    const { data, error } = await getSupabase()
      .from('members')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[storage] resetMemberPassword:', error);
      throw new Error('Error de base de datos en resetMemberPassword');
    }
    if (!data) throw new ApiError('Miembro no encontrado.', 404);
  }

  // --- Progreso UWU ---

  static async getProgressMap(): Promise<Record<string, MemberProgress>> {
    const supabase = getSupabase();

    // Las dos consultas se lanzan a la vez: esta es la lectura que hacen tanto el
    // roster como el buscador de parties.
    const [general, roles] = await Promise.all([
      supabase.from('member_progress').select('*'),
      supabase.from('member_role_progress').select('*'),
    ]);

    const generalRows = unwrap<ProgressRow[]>(general, 'getProgressMap');
    const roleRows = missingRoleProgressTable(roles.error)
      ? []
      : unwrap<RoleProgressRow[]>(roles, 'getProgressMap (por rol)');

    const rolesByMember = new Map<string, RoleProgressRow[]>();
    for (const row of roleRows) {
      const list = rolesByMember.get(row.member_id) ?? [];
      list.push(row);
      rolesByMember.set(row.member_id, list);
    }

    const generalByMember = new Map(generalRows.map(row => [row.member_id, row]));

    // La unión de ambas tablas, no solo la general: un miembro con ajustes por rol debe
    // aparecer en el mapa aunque le falte la fila de progreso general.
    const memberIds = new Set([...generalByMember.keys(), ...rolesByMember.keys()]);

    return Object.fromEntries(
      Array.from(memberIds, id => [
        id,
        toMemberProgress(id, generalByMember.get(id), rolesByMember.get(id) ?? []),
      ])
    );
  }

  static async getProgressByMemberId(memberId: string): Promise<MemberProgress> {
    const supabase = getSupabase();

    const [general, roles] = await Promise.all([
      supabase.from('member_progress').select('*').eq('member_id', memberId).maybeSingle(),
      supabase.from('member_role_progress').select('*').eq('member_id', memberId),
    ]);

    const roleError = missingRoleProgressTable(roles.error) ? null : roles.error;

    if (general.error || roleError) {
      console.error('[storage] getProgressByMemberId:', general.error ?? roleError);
      throw new Error('Error de base de datos en getProgressByMemberId');
    }

    if (!general.data && (roles.data ?? []).length === 0) return emptyMemberProgress(memberId);

    return toMemberProgress(
      memberId,
      (general.data as ProgressRow | null) ?? undefined,
      (roles.data ?? []) as RoleProgressRow[]
    );
  }

  /**
   * Guarda el progreso de un miembro en las 5 fases.
   *
   * Con `subrole` escribe solo el de ese rol; sin él, el progreso general, que es el que
   * heredan todos los roles sin ajuste propio.
   */
  static async updateProgress(
    memberId: string,
    pcts: [number, number, number, number, number],
    subrole: SubRole | null = null
  ): Promise<MemberProgress> {
    const normalized = normalizePhaseProgress(pcts);
    const values = {
      p1_garuda_pct: normalized[0],
      p2_ifrit_pct: normalized[1],
      p3_titan_pct: normalized[2],
      p4_ultima_pct: normalized[3],
      p5_roulette_pct: normalized[4],
      updated_at: new Date().toISOString(),
    };

    const { error } = subrole
      ? await getSupabase()
          .from('member_role_progress')
          .upsert({ member_id: memberId, subrole, ...values }, { onConflict: 'member_id,subrole' })
      : await getSupabase()
          .from('member_progress')
          .upsert({ member_id: memberId, ...values }, { onConflict: 'member_id' });

    if (error) {
      console.error('[storage] updateProgress:', error);
      throw new Error('Error de base de datos en updateProgress');
    }

    return this.getProgressByMemberId(memberId);
  }

  /** Cambia entre un progreso único para todos los roles y uno por rol. */
  static async setProgressMode(
    memberId: string,
    mode: ProgressMode
  ): Promise<MemberProgress> {
    // Solo se toca `progress_mode`: el upsert crea la fila en cero si aún no existe y,
    // si existe, deja intactos los porcentajes.
    const { error } = await getSupabase()
      .from('member_progress')
      .upsert(
        { member_id: memberId, progress_mode: mode, updated_at: new Date().toISOString() },
        { onConflict: 'member_id' }
      );

    if (error) {
      console.error('[storage] setProgressMode:', error);
      throw new Error('Error de base de datos en setProgressMode');
    }

    return this.getProgressByMemberId(memberId);
  }

  /** Descarta el ajuste de un rol: vuelve a heredar el progreso general. */
  static async clearRoleProgress(
    memberId: string,
    subrole: SubRole
  ): Promise<MemberProgress> {
    const { error } = await getSupabase()
      .from('member_role_progress')
      .delete()
      .eq('member_id', memberId)
      .eq('subrole', subrole);

    if (error) {
      console.error('[storage] clearRoleProgress:', error);
      throw new Error('Error de base de datos en clearRoleProgress');
    }

    return this.getProgressByMemberId(memberId);
  }

  // --- Disponibilidad ---

  static async getAvailabilities(): Promise<MemberAvailability[]> {
    const rows = unwrap<AvailabilityRow[]>(
      await getSupabase().from('member_availability').select('member_id, day_of_week, hour_slot'),
      'getAvailabilities'
    );

    return rows.map(r => ({
      memberId: r.member_id,
      dayOfWeek: r.day_of_week,
      hourSlot: r.hour_slot,
    }));
  }

  static async getMemberAvailability(memberId: string): Promise<MemberAvailability[]> {
    const rows = unwrap<AvailabilityRow[]>(
      await getSupabase()
        .from('member_availability')
        .select('member_id, day_of_week, hour_slot')
        .eq('member_id', memberId),
      'getMemberAvailability'
    );

    return rows.map(r => ({
      memberId: r.member_id,
      dayOfWeek: r.day_of_week,
      hourSlot: r.hour_slot,
    }));
  }

  /**
   * Sustituye la disponibilidad completa del miembro.
   *
   * Va por una función de PostgreSQL para que el borrado y la inserción ocurran en una
   * sola transacción: hacerlo en dos llamadas dejaría al miembro sin horarios si la
   * segunda fallara.
   */
  static async setMemberAvailability(
    memberId: string,
    slots: { dayOfWeek: number; hourSlot: number }[]
  ): Promise<void> {
    const { error } = await getSupabase().rpc('replace_member_availability', {
      p_member_id: memberId,
      p_slots: slots,
    });

    if (error) {
      console.error('[storage] setMemberAvailability:', error);
      throw new Error('Error de base de datos en setMemberAvailability');
    }
  }

  // --- Parties oficiales ---

  /** Parties vigentes: aceptadas y cuyo horario aún no ha concluido. */
  static async getScheduledParties(includePast: boolean = false): Promise<ScheduledParty[]> {
    const [rowsResult, allVolunteers] = await Promise.all([
      getSupabase()
        .from('party_schedules')
        .select(PARTY_SELECT)
        .order('scheduled_date', { ascending: true })
        .order('hour_slot', { ascending: true }),
      this.getAllVolunteers().catch(() => []),
    ]);

    const rows = unwrap<PartyRow[]>(rowsResult, 'getScheduledParties');
    const parties = rows.map(r =>
      toScheduledParty(
        r,
        allVolunteers.filter(v => v.partyScheduleId === r.id)
      )
    );

    if (includePast) return parties;
    return parties.filter(p => p.status === 'ACCEPTED' && !isPartyExpired(p));
  }

  static async getPastParties(): Promise<ScheduledParty[]> {
    const [rowsResult, allVolunteers] = await Promise.all([
      getSupabase()
        .from('party_schedules')
        .select(PARTY_SELECT)
        .order('scheduled_date', { ascending: false })
        .order('hour_slot', { ascending: false }),
      this.getAllVolunteers().catch(() => []),
    ]);

    const rows = unwrap<PartyRow[]>(rowsResult, 'getPastParties');
    return rows
      .map(r =>
        toScheduledParty(
          r,
          allVolunteers.filter(v => v.partyScheduleId === r.id)
        )
      )
      .filter(p => isPartyExpired(p) || p.status === 'COMPLETED');
  }

  /**
   * Cuenta cuántas incursiones pasadas concluidas ha jugado cada miembro con confirmación 'CONFIRMED'.
   */
  static async getAttendanceCounts(): Promise<Record<string, number>> {
    const pastParties = await this.getPastParties();
    const counts: Record<string, number> = {};

    for (const party of pastParties) {
      for (const m of party.members) {
        if (m.confirmationStatus === 'CONFIRMED') {
          counts[m.memberId] = (counts[m.memberId] ?? 0) + 1;
        }
      }
    }

    return counts;
  }


  static async scheduleParty(
    party: Omit<ScheduledParty, 'id' | 'createdAt'>
  ): Promise<ScheduledParty> {
    const supabase = getSupabase();

    const { data: inserted, error } = await supabase
      .from('party_schedules')
      .insert({
        scheduled_date: party.scheduledDate,
        day_of_week: party.dayOfWeek,
        hour_slot: party.hourSlot,
        duration_hours: party.durationHours,
        start_time_label: party.startTimeLabel,
        status: party.status,
        notes: party.notes ?? null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[storage] scheduleParty:', error);
      throw new Error('Error de base de datos en scheduleParty');
    }

    const partyId = (inserted as { id: string }).id;

    const { error: membersError } = await supabase.from('party_schedule_members').insert(
      party.members.map(m => ({
        party_schedule_id: partyId,
        member_id: m.memberId,
        character_name: m.characterName,
        assigned_job: m.assignedJob,
        assigned_role: m.assignedRole,
        is_main_job: m.isMainJob,
        confirmation_status: m.confirmationStatus || 'PENDING',
      }))
    );

    if (membersError) {
      // Sin integrantes la party no sirve de nada, así que se deshace la cabecera en
      // lugar de dejar una incursión vacía en el calendario.
      await supabase.from('party_schedules').delete().eq('id', partyId);
      console.error('[storage] scheduleParty (integrantes):', membersError);

      if (membersError.code === '23505') {
        throw new ApiError(
          'La party tiene un miembro repetido o dos personas en el mismo puesto.',
          409
        );
      }
      throw new Error('Error de base de datos en scheduleParty');
    }

    const created = await this.getPartyById(partyId);
    if (!created) throw new Error('La party se creó pero no pudo leerse de vuelta');

    return created;
  }

  static async getPartyById(id: string): Promise<ScheduledParty | undefined> {
    const [partyResult, volunteers] = await Promise.all([
      getSupabase()
        .from('party_schedules')
        .select(PARTY_SELECT)
        .eq('id', id)
        .maybeSingle(),
      this.getVolunteers(id).catch(() => []),
    ]);

    const { data, error } = partyResult;

    if (error) {
      console.error('[storage] getPartyById:', error);
      throw new Error('Error de base de datos en getPartyById');
    }

    return data ? toScheduledParty(data as PartyRow, volunteers) : undefined;
  }

  /**
   * Registra la asistencia de un integrante.
   *
   * `isAdminOverride` lo decide el route handler a partir del tipo de sesión; nunca
   * llega desde el cuerpo de la petición.
   */
  static async confirmPartyAttendance(
    partyId: string,
    memberId: string,
    status: ConfirmationStatus,
    isAdminOverride: boolean = false
  ): Promise<{ success: boolean; party?: ScheduledParty; message?: string }> {
    const party = await this.getPartyById(partyId);
    if (!party) return { success: false, message: 'Party no encontrada.' };

    if (party.status !== 'ACCEPTED') {
      return { success: false, message: 'Esta party ya no está activa.' };
    }

    if (!isAdminOverride && !isConfirmationWindowOpen(party.scheduledDate, party.hourSlot, 5)) {
      return {
        success: false,
        message: 'El plazo límite de confirmación (5 horas antes del inicio) ha vencido.',
      };
    }

    if (!party.members.some(m => m.memberId === memberId)) {
      return { success: false, message: 'El miembro no está asignado a esta party.' };
    }

    const { error } = await getSupabase()
      .from('party_schedule_members')
      .update({
        confirmation_status: status,
        confirmed_at: status === 'CONFIRMED' ? new Date().toISOString() : null,
      })
      .eq('party_schedule_id', partyId)
      .eq('member_id', memberId);

    if (error) {
      console.error('[storage] confirmPartyAttendance:', error);
      throw new Error('Error de base de datos en confirmPartyAttendance');
    }

    return { success: true, party: await this.getPartyById(partyId) };
  }

  static async cancelScheduledParty(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('party_schedules')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[storage] cancelScheduledParty:', error);
      throw new Error('Error de base de datos en cancelScheduledParty');
    }
  }

  // --- Voluntarios / Suplentes ("¡Puedo ayudar!") ---

  static async getAllVolunteers(): Promise<PartyVolunteer[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('party_volunteers')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      if (missingTableError(error, 'party_volunteers')) {
        return Array.from(inMemoryVolunteers.values());
      }
      console.error('[storage] getAllVolunteers:', error);
      return Array.from(inMemoryVolunteers.values());
    }

    const rows = data as VolunteerRow[];
    return rows.map(toPartyVolunteer);
  }

  static async getVolunteers(partyScheduleId?: string, slotKey?: string): Promise<PartyVolunteer[]> {
    const all = await this.getAllVolunteers();
    return all.filter(v => {
      if (partyScheduleId && v.partyScheduleId === partyScheduleId) return true;
      if (slotKey && v.slotKey === slotKey) return true;
      return false;
    });
  }

  static async registerVolunteer(data: {
    partyScheduleId?: string;
    slotKey?: string;
    memberId: string;
    characterName: string;
    assignedJob: JobId;
    assignedRole: string;
    availabilityNote?: string;
  }): Promise<PartyVolunteer> {
    const supabase = getSupabase();

    // Eliminar previo si existe para actualizar
    if (data.partyScheduleId) {
      await supabase
        .from('party_volunteers')
        .delete()
        .eq('party_schedule_id', data.partyScheduleId)
        .eq('member_id', data.memberId);
    } else if (data.slotKey) {
      await supabase
        .from('party_volunteers')
        .delete()
        .eq('slot_key', data.slotKey)
        .eq('member_id', data.memberId);
    }

    const newRow = {
      party_schedule_id: data.partyScheduleId ?? null,
      slot_key: data.slotKey ?? null,
      member_id: data.memberId,
      character_name: data.characterName,
      assigned_job: data.assignedJob,
      assigned_role: data.assignedRole,
      availability_note: data.availabilityNote ?? null,
    };

    const { data: inserted, error } = await supabase
      .from('party_volunteers')
      .insert(newRow)
      .select('*')
      .single();

    if (error) {
      if (missingTableError(error, 'party_volunteers')) {
        const memId = `${data.partyScheduleId || data.slotKey}_${data.memberId}`;
        const vol: PartyVolunteer = {
          id: memId,
          partyScheduleId: data.partyScheduleId ?? null,
          slotKey: data.slotKey ?? null,
          memberId: data.memberId,
          characterName: data.characterName,
          assignedJob: data.assignedJob,
          assignedRole: data.assignedRole,
          availabilityNote: data.availabilityNote,
          createdAt: new Date().toISOString(),
        };
        inMemoryVolunteers.set(memId, vol);
        return vol;
      }
      console.error('[storage] registerVolunteer:', error);
      throw new Error('Error al registrar voluntario en base de datos');
    }

    const volunteer = toPartyVolunteer(inserted as VolunteerRow);
    const memKey = `${volunteer.partyScheduleId || volunteer.slotKey}_${volunteer.memberId}`;
    inMemoryVolunteers.set(memKey, volunteer);
    return volunteer;
  }

  static async removeVolunteer(data: {
    memberId: string;
    partyScheduleId?: string;
    slotKey?: string;
  }): Promise<void> {
    const supabase = getSupabase();
    let query = supabase.from('party_volunteers').delete().eq('member_id', data.memberId);

    if (data.partyScheduleId) {
      query = query.eq('party_schedule_id', data.partyScheduleId);
    } else if (data.slotKey) {
      query = query.eq('slot_key', data.slotKey);
    }

    const { error } = await query;
    if (error && !missingTableError(error, 'party_volunteers')) {
      console.error('[storage] removeVolunteer:', error);
    }

    const memKey = `${data.partyScheduleId || data.slotKey}_${data.memberId}`;
    inMemoryVolunteers.delete(memKey);
  }

  // --- Convocatorias de parties incompletas promovidas por el Admin ---

  static async getPromotedRecruitments(): Promise<PromotedRecruitment[]> {
    const supabase = getSupabase();
    const [recruitmentsRes, allVolunteers] = await Promise.all([
      supabase
        .from('promoted_recruitments')
        .select('*')
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false }),
      this.getAllVolunteers().catch(() => []),
    ]);

    if (recruitmentsRes.error) {
      if (missingTableError(recruitmentsRes.error, 'promoted_recruitments')) {
        return Array.from(inMemoryPromoted.values()).map(r => ({
          ...r,
          volunteers: allVolunteers.filter(v => v.slotKey === r.slotKey),
        }));
      }
      console.error('[storage] getPromotedRecruitments:', recruitmentsRes.error);
      return Array.from(inMemoryPromoted.values()).map(r => ({
        ...r,
        volunteers: allVolunteers.filter(v => v.slotKey === r.slotKey),
      }));
    }

    const rows = recruitmentsRes.data as PromotedRecruitmentRow[];
    return rows.map(r =>
      toPromotedRecruitment(
        r,
        allVolunteers.filter(v => v.slotKey === r.slot_key)
      )
    );
  }

  static async promoteSlotRecruitment(data: {
    slotKey: string;
    dayOfWeek: number;
    hourSlot: number;
    notes?: string;
    missingSlots: SlotRole[];
    createdBy: string;
  }): Promise<PromotedRecruitment> {
    const supabase = getSupabase();

    const row = {
      slot_key: data.slotKey,
      day_of_week: data.dayOfWeek,
      hour_slot: data.hourSlot,
      notes: data.notes ?? null,
      missing_slots: data.missingSlots,
      status: 'OPEN',
      created_by: data.createdBy,
    };

    const { data: upserted, error } = await supabase
      .from('promoted_recruitments')
      .upsert(row, { onConflict: 'slot_key' })
      .select('*')
      .single();

    if (error) {
      if (missingTableError(error, 'promoted_recruitments')) {
        const item: PromotedRecruitment = {
          id: `promoted_${data.slotKey}`,
          slotKey: data.slotKey,
          dayOfWeek: data.dayOfWeek,
          hourSlot: data.hourSlot,
          notes: data.notes,
          missingSlots: data.missingSlots,
          status: 'OPEN',
          createdBy: data.createdBy,
          createdAt: new Date().toISOString(),
          volunteers: [],
        };
        inMemoryPromoted.set(data.slotKey, item);
        return item;
      }
      console.error('[storage] promoteSlotRecruitment:', error);
      throw new Error('Error al promover la franja en base de datos');
    }

    const volunteers = await this.getVolunteers(undefined, data.slotKey);
    const result = toPromotedRecruitment(upserted as PromotedRecruitmentRow, volunteers);
    inMemoryPromoted.set(data.slotKey, result);
    return result;
  }

  static async closePromotedRecruitment(slotKey: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('promoted_recruitments')
      .delete()
      .eq('slot_key', slotKey);

    if (error && !missingTableError(error, 'promoted_recruitments')) {
      console.error('[storage] closePromotedRecruitment:', error);
    }
    inMemoryPromoted.delete(slotKey);
  }

  // --- Histórico semanal ---

  static async getWeeklySnapshots(): Promise<WeeklyFcSnapshot[]> {
    const rows = unwrap<HistoryRow[]>(
      await getSupabase()
        .from('progress_history')
        .select('*')
        .order('year', { ascending: false })
        .order('week_number', { ascending: false }),
      'getWeeklySnapshots'
    );

    // Las filas son por miembro; la vista histórica trabaja por semana de la FC.
    const byWeek = new Map<string, ProgressHistoryEntry[]>();
    for (const row of rows) {
      const key = `${row.year}_${row.week_number}`;
      const list = byWeek.get(key) ?? [];
      list.push(toHistoryEntry(row));
      byWeek.set(key, list);
    }

    return Array.from(byWeek.values())
      .map(buildSnapshot)
      .sort((a, b) => b.year - a.year || b.weekNumber - a.weekNumber);
  }

  /**
   * Archiva el progreso actual en la semana del calendario civil especificada o en curso.
   *
   * Es idempotente gracias al UNIQUE (member_id, year, week_number): volver a aceptar
   * la semana actualiza la foto de esa semana en vez de duplicarla. Solo guarda
   * semanas explícitamente aceptadas por el administrador.
   */
  static async createWeeklySnapshot(params?: {
    year?: number;
    weekNumber?: number;
  }): Promise<WeeklyFcSnapshot> {
    const currentWeek = getCalendarWeek();
    const year = params?.year ?? currentWeek.year;
    const weekNumber = params?.weekNumber ?? currentWeek.weekNumber;

    const [members, progressMap] = await Promise.all([
      this.getMembers(),
      this.getProgressMap(),
    ]);

    if (members.length === 0) {
      throw new ApiError('No hay miembros activos que archivar.', 400);
    }

    const recordedAt = new Date().toISOString();

    const rows = members.map(m => {
      // Con progreso por rol, la foto semanal guarda el del main job: es el rol con el
      // que se cuenta al miembro en el roster y en el promedio de la FC.
      const p = memberDisplayProgress(m, progressMap[m.id]);
      return {
        member_id: m.id,
        character_name: m.characterName,
        week_number: weekNumber,
        year,
        p1_pct: p.p1GarudaPct,
        p2_pct: p.p2IfritPct,
        p3_pct: p.p3TitanPct,
        p4_pct: p.p4UltimaPct,
        p5_pct: p.p5RoulettePct,
        overall_score: p.overallScore,
        recorded_at: recordedAt,
      };
    });

    const inserted = unwrap<HistoryRow[]>(
      await getSupabase()
        .from('progress_history')
        .upsert(rows, { onConflict: 'member_id,year,week_number' })
        .select('*'),
      'createWeeklySnapshot'
    );

    return buildSnapshot(inserted.map(toHistoryEntry));
  }

  // --- Invitaciones ---

  /**
   * Crea una invitación y devuelve el token EN CLARO.
   *
   * Es la única vez que ese valor existe fuera de quien lo recibe: en la base solo queda
   * su SHA-256. Si el administrador lo pierde, revoca el token y genera otro.
   */
  static async createInviteToken(params: {
    label?: string | null;
    expiresInDays?: number | null;
  }): Promise<{ token: string; invite: InviteToken }> {
    const token = generateInviteToken();

    const expiresAt =
      params.expiresInDays != null
        ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { data, error } = await getSupabase()
      .from('invite_tokens')
      .insert({
        token_hash: hashInviteToken(token),
        label: params.label?.trim() || null,
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[storage] createInviteToken:', error);
      throw new Error('Error de base de datos en createInviteToken');
    }

    return { token, invite: toInviteToken(data as InviteTokenRow) };
  }

  static async getInviteTokens(): Promise<InviteToken[]> {
    const rows = unwrap<InviteTokenRow[]>(
      await getSupabase()
        .from('invite_tokens')
        .select('*')
        .order('created_at', { ascending: false }),
      'getInviteTokens'
    );

    return rows.map(toInviteToken);
  }

  /**
   * Reclama un token para un alta.
   *
   * Va por una función de PostgreSQL porque el "comprobar que está libre" y el "marcarlo
   * como usado" tienen que ocurrir en la misma operación: hacerlo en dos consultas
   * dejaría una ventana en la que dos personas podrían gastar la misma invitación.
   *
   * Devuelve el id reclamado, que hay que confirmar con `confirmInviteToken` o devolver
   * con `releaseInviteToken` si el alta acaba fallando.
   */
  static async claimInviteToken(rawToken: string): Promise<string> {
    const { data, error } = await getSupabase().rpc('claim_invite_token', {
      p_token_hash: hashInviteToken(rawToken),
    });

    if (error) {
      console.error('[storage] claimInviteToken:', error);
      throw new Error('Error de base de datos en claimInviteToken');
    }

    const filas = (data ?? []) as { id: string }[];

    // Un token inexistente, ya gastado, revocado o caducado son el mismo mensaje: no
    // tiene sentido decirle a quien lo intenta en cuál de los cuatro casos está.
    if (filas.length === 0) {
      throw new AuthError('El código de invitación no es válido o ya se ha usado.', 403);
    }

    return filas[0].id;
  }

  /** Deja constancia de quién gastó la invitación. */
  static async confirmInviteToken(id: string, member: Member): Promise<void> {
    const { error } = await getSupabase()
      .from('invite_tokens')
      .update({ used_by_member_id: member.id, used_by_name: member.characterName })
      .eq('id', id);

    // No se propaga: el miembro ya está creado y su alta es válida. Perder la anotación
    // de quién usó el token no justifica devolverle un error a quien se acaba de registrar.
    if (error) console.error('[storage] confirmInviteToken:', error);
  }

  /** Devuelve el token al estado disponible cuando el alta falló después de reclamarlo. */
  static async releaseInviteToken(id: string): Promise<void> {
    const { error } = await getSupabase().rpc('release_invite_token', { p_id: id });
    if (error) console.error('[storage] releaseInviteToken:', error);
  }

  /** Anula una invitación no usada. Las ya gastadas se conservan como registro. */
  static async revokeInviteToken(id: string): Promise<void> {
    const { data, error } = await getSupabase()
      .from('invite_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .is('used_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[storage] revokeInviteToken:', error);
      throw new Error('Error de base de datos en revokeInviteToken');
    }
    if (!data) throw new ApiError('La invitación no existe o ya se ha usado.', 404);
  }

  /**
   * Elimina del registro histórico una semana previamente archivada.
   * Solo el administrador puede invocar esta operación.
   */
  static async deleteWeeklySnapshot(year: number, weekNumber: number): Promise<void> {
    const { error } = await getSupabase()
      .from('progress_history')
      .delete()
      .eq('year', year)
      .eq('week_number', weekNumber);

    if (error) {
      console.error('[storage] deleteWeeklySnapshot:', error);
      throw new Error('Error al eliminar semana histórica');
    }
  }
}

/**
 * Agrega las fotos individuales de una semana en el resumen que consume la vista
 * histórica: promedio de la FC, reparto por fase y rango de fechas del calendario civil.
 */
function buildSnapshot(entries: ProgressHistoryEntry[]): WeeklyFcSnapshot {
  const phaseDistribution = {
    garuda: 0,
    ifrit: 0,
    titan: 0,
    ultima: 0,
    enrage: 0,
    cleared: 0,
  };

  let totalScore = 0;

  for (const e of entries) {
    totalScore += e.overallScore;

    if (e.p5Pct >= 100) phaseDistribution.cleared++;
    else if (e.p5Pct > 0) phaseDistribution.enrage++;
    else if (e.p4Pct > 0) phaseDistribution.ultima++;
    else if (e.p3Pct > 0) phaseDistribution.titan++;
    else if (e.p2Pct > 0) phaseDistribution.ifrit++;
    else phaseDistribution.garuda++;
  }

  const first = entries[0];
  const year = first?.year ?? new Date().getUTCFullYear();
  const weekNumber = first?.weekNumber ?? 0;
  const { weekStartDate, weekEndDate, formattedRange } = getCalendarWeekRange(year, weekNumber);

  return {
    weekNumber,
    year,
    weekStartDate,
    weekEndDate,
    formattedRange,
    recordedAt: first?.recordedAt ?? new Date().toISOString(),
    memberSnapshots: [...entries].sort((a, b) => b.overallScore - a.overallScore),
    averageScore: entries.length > 0 ? Math.round(totalScore / entries.length) : 0,
    phaseDistribution,
  };
}

// `calculateOverallScore` se re-exporta porque el seed lo necesita para las fotos
// históricas simuladas.
export { calculateOverallScore };
