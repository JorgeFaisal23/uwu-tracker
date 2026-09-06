'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Member, 
  UwuProgress, 
  MemberAvailability, 
  PartyCombination, 
  ScheduledParty, 
  WeeklyFcSnapshot, 
  UserSession,
  ConfirmationStatus,
  SlotDiagnostic
} from '@/types';
import { getPartyStartDateTime, isPartyExpired } from '@/lib/date-utils';
import AstralCanvas from '@/components/astral-canvas';
import Navbar from '@/components/navbar';
import UpcomingPartyBanner from '@/components/upcoming-party-banner';
import UwuPhaseTracker from '@/components/uwu-phase-tracker';
import JobBadge from '@/components/job-badge';
import PartyFinderView from '@/components/party-finder-view';
import AvailabilityGrid from '@/components/availability-grid';
import HistoricalView from '@/components/historical-view';
import MemberAuthModal from '@/components/modals/member-auth-modal';
import MemberProfileModal from '@/components/modals/member-profile-modal';
import AdminModal from '@/components/modals/admin-modal';
import { Users, Search, ArrowUpDown } from 'lucide-react';

interface AppData {
  members: Member[];
  progressMap: Record<string, UwuProgress>;
  availabilities: MemberAvailability[];
  viableSlotsMap: Record<string, PartyCombination[]>;
  nearMissSlots: SlotDiagnostic[];
  scheduledParties: ScheduledParty[];
  pastParties: ScheduledParty[];
  snapshots: WeeklyFcSnapshot[];
  attendanceCounts: Record<string, number>;
}

const EMPTY_APP_DATA: AppData = {
  members: [],
  progressMap: {},
  availabilities: [],
  viableSlotsMap: {},
  nearMissSlots: [],
  scheduledParties: [],
  pastParties: [],
  snapshots: [],
  attendanceCounts: {},
};

async function readJson<T>(res: Response, fallback: T): Promise<T> {
  if (!res.ok) return fallback;
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/** Trae de una vez todo lo que pinta la aplicación. No toca estado de React. */
async function fetchAppData(): Promise<AppData> {
  try {
    const [membersRes, partiesRes, availRes, historyRes] = await Promise.all([
      fetch('/api/members'),
      fetch('/api/parties'),
      fetch('/api/availability'),
      fetch('/api/history'),
    ]);

    const [membersData, partiesData, availData, historyData] = await Promise.all([
      readJson(membersRes, {} as {
        members?: Member[];
        progressMap?: Record<string, UwuProgress>;
        attendanceCounts?: Record<string, number>;
      }),
      readJson(partiesRes, {} as {
        viableSlotsMap?: Record<string, PartyCombination[]>;
        nearMissSlots?: SlotDiagnostic[];
        scheduledParties?: ScheduledParty[];
        pastParties?: ScheduledParty[];
      }),
      readJson(availRes, {} as { availabilities?: MemberAvailability[] }),
      readJson(historyRes, {} as { snapshots?: WeeklyFcSnapshot[] }),
    ]);

    return {
      members: membersData.members ?? [],
      progressMap: membersData.progressMap ?? {},
      viableSlotsMap: partiesData.viableSlotsMap ?? {},
      nearMissSlots: partiesData.nearMissSlots ?? [],
      scheduledParties: partiesData.scheduledParties ?? [],
      pastParties: partiesData.pastParties ?? [],
      availabilities: availData.availabilities ?? [],
      snapshots: historyData.snapshots ?? [],
      attendanceCounts: membersData.attendanceCounts ?? {},
    };
  } catch (err) {
    console.error('Error cargando datos:', err);
    return EMPTY_APP_DATA;
  }
}

async function fetchSession(): Promise<UserSession> {
  try {
    const res = await fetch('/api/auth/session');
    const data = await readJson(res, {} as { session?: UserSession });
    return data.session ?? { type: 'GUEST' };
  } catch (err) {
    console.error('Error cargando sesión:', err);
    return { type: 'GUEST' };
  }
}

/**
 * La aplicación en sí. Solo se monta cuando `src/app/page.tsx` ya ha comprobado en el
 * servidor que hay sesión, así que aquí se puede dar por hecha.
 *
 * `initialSession` llega ya resuelta desde el servidor: sin ella el primer render
 * partiría de GUEST y la interfaz parpadearía como "no identificado" durante el viaje
 * de ida y vuelta a `/api/auth/session`.
 */
export default function TrackerApp({ initialSession }: { initialSession: UserSession }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'parties' | 'availability' | 'history'>('dashboard');
  const [selectedTimezone, setSelectedTimezone] = useState('America/Mexico_City');
  const [session, setSession] = useState<UserSession>(initialSession);

  // Datos globales
  const [members, setMembers] = useState<Member[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, UwuProgress>>({});
  const [availabilities, setAvailabilities] = useState<MemberAvailability[]>([]);
  const [viableSlotsMap, setViableSlotsMap] = useState<Record<string, PartyCombination[]>>({});
  const [nearMissSlots, setNearMissSlots] = useState<SlotDiagnostic[]>([]);
  const [scheduledParties, setScheduledParties] = useState<ScheduledParty[]>([]);
  const [pastParties, setPastParties] = useState<ScheduledParty[]>([]);
  const [snapshots, setSnapshots] = useState<WeeklyFcSnapshot[]>([]);
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({});

  // Filtros en dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TANK' | 'HEALER' | 'DPS'>('ALL');
  const [sortBy, setSortBy] = useState<'PRIORITY_LOW_FIRST' | 'HIGH_FIRST' | 'NAME'>('PRIORITY_LOW_FIRST');

  // Modales
  const [isMemberAuthModalOpen, setIsMemberAuthModalOpen] = useState(false);
  const [isMemberProfileModalOpen, setIsMemberProfileModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Carga de datos. `fetchAppData` y `fetchSession` viven fuera del componente y no
  // tocan el estado: así el efecto de arranque solo escribe estado después de esperar
  // a la red, y no en cascada durante el render.
  const applyData = useCallback((data: AppData) => {
    setMembers(data.members);
    setProgressMap(data.progressMap);
    setViableSlotsMap(data.viableSlotsMap);
    setNearMissSlots(data.nearMissSlots);
    setScheduledParties(data.scheduledParties);
    setPastParties(data.pastParties);
    setAvailabilities(data.availabilities);
    setSnapshots(data.snapshots);
    setAttendanceCounts(data.attendanceCounts);
  }, []);

  /** Recarga todo tras una mutación (guardar progreso, oficializar party, etc.). */
  const loadAllData = useCallback(async () => {
    applyData(await fetchAppData());
  }, [applyData]);

  /**
   * La sesión es la cookie httpOnly firmada por el servidor; el cliente solo la
   * consulta. Antes vivía en localStorage, donde escribir {"type":"ADMIN"} bastaba
   * para abrir el panel de administración.
   */
  const loadSession = useCallback(async () => {
    setSession(await fetchSession());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const data = await fetchAppData();
      if (cancelled) return;
      applyData(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [applyData]);

  const handleSetSession = (newSession: UserSession) => {
    setSession(newSession);
  };

  /**
   * Cerrar sesión ya no deja la aplicación a la vista en modo invitado: la cookie
   * desaparece y `router.refresh()` hace que el servidor vuelva a resolver la ruta, que
   * ahora responde con el portón de acceso.
   */
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
  };

  // Guardar disponibilidad de usuario
  const handleSaveAvailability = async (slots: { dayOfWeek: number; hourSlot: number }[]) => {
    if (!session.memberId) return;
    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots }),
    });
    if (res.ok) {
      await loadAllData();
    }
  };

  // Oficializar party (Admin)
  const handleAcceptParty = async (partyData: {
    scheduledDate: string;
    dayOfWeek: number;
    hourSlot: number;
    startTimeLabel: string;
    durationHours: number;
    notes?: string;
    members: {
      memberId: string;
      characterName: string;
      assignedJob: string;
      assignedRole: 'MT' | 'OT' | 'PH' | 'SH' | 'M1' | 'M2' | 'PR' | 'C';
      isMainJob: boolean;
      confirmationStatus?: ConfirmationStatus;
    }[];
  }) => {
    const res = await fetch('/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partyData),
    });
    if (res.ok) {
      await loadAllData();
    }
  };

  // Confirmar asistencia de miembro a una party (Límite 5h antes)
  const handleConfirmAttendance = async (
    partyId: string,
    memberId: string,
    status: ConfirmationStatus
  ) => {
    try {
      // El servidor decide si puede saltarse la ventana de 5 h a partir de la sesión;
      // el cliente ya no manda ninguna bandera de administrador.
      const res = await fetch('/api/parties/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyId, memberId, status }),
      });
      if (res.ok) {
        await loadAllData();
      } else {
        const data = await res.json();
        alert(data.error || 'No fue posible registrar la confirmación.');
      }
    } catch (err) {
      console.error('Error al registrar confirmación:', err);
    }
  };

  // Cancelar party oficial (Admin)
  const handleCancelParty = async (id: string) => {
    const res = await fetch(`/api/parties?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAllData();
    }
  };

  // Tomar o aceptar snapshot histórico semanal (Admin)
  const handleTakeSnapshot = async (params?: { year?: number; weekNumber?: number }) => {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: params ? JSON.stringify(params) : undefined,
    });
    if (res.ok) {
      await loadAllData();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Error al archivar la semana');
    }
  };

  // Eliminar snapshot histórico semanal (Admin)
  const handleDeleteSnapshot = async (year: number, weekNumber: number) => {
    const res = await fetch(`/api/history?year=${year}&weekNumber=${weekNumber}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await loadAllData();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Error al eliminar la semana');
    }
  };

  // Filtrado y ordenamiento de miembros para el Dashboard
  const filteredMembers = members.filter(m => {
    const matchesSearch = m.characterName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (roleFilter === 'ALL') return true;
    if (roleFilter === 'TANK') return ['PLD', 'WAR', 'DRK', 'GNB'].includes(m.mainJob);
    if (roleFilter === 'HEALER') return ['WHM', 'AST', 'SCH', 'SGE'].includes(m.mainJob);
    if (roleFilter === 'DPS') {
      return !['PLD', 'WAR', 'DRK', 'GNB', 'WHM', 'AST', 'SCH', 'SGE'].includes(m.mainJob);
    }
    return true;
  });

  filteredMembers.sort((a, b) => {
    const scoreA = progressMap[a.id]?.overallScore || 0;
    const scoreB = progressMap[b.id]?.overallScore || 0;

    if (sortBy === 'PRIORITY_LOW_FIRST') {
      return scoreA - scoreB; // Menor progreso primero (mayor prioridad)
    }
    if (sortBy === 'HIGH_FIRST') {
      return scoreB - scoreA;
    }
    return a.characterName.localeCompare(b.characterName);
  });

  // Estadísticas globales de la FC
  const activeMembersCount = members.length;
  let totalFcScore = 0;
  for (const m of members) {
    totalFcScore += progressMap[m.id]?.overallScore || 0;
  }
  const avgFcScore = activeMembersCount > 0 ? Math.round(totalFcScore / activeMembersCount) : 0;

  // Próxima party aceptada (la más próxima para cada persona que NO haya expirado)
  const activeScheduledParties = scheduledParties.filter(p => !isPartyExpired(p));
  activeScheduledParties.sort((a, b) => {
    // getPartyStartDateTime resuelve la hora en la zona de la FC; construir el Date a
    // partir de la cadena la interpretaba en la hora local del navegador.
    return (
      getPartyStartDateTime(a.scheduledDate, a.hourSlot).getTime() -
      getPartyStartDateTime(b.scheduledDate, b.hourSlot).getTime()
    );
  });

  // Para cada persona con sesión iniciada, su party principal es la próxima incursión en la que está convocada.
  // Si no está convocada en ninguna o si la sesión es ADMIN / GUEST, muestra la próxima party general de la FC.
  const memberUpcomingParty = session.memberId
    ? activeScheduledParties.find(p => p.members.some(m => m.memberId === session.memberId))
    : null;
  const nextScheduledParty =
    memberUpcomingParty ||
    (activeScheduledParties.length > 0 ? activeScheduledParties[0] : null);

  // Miembro actualmente conectado
  const currentLoggedInMember = members.find(m => m.id === session.memberId);
  const currentLoggedInProgress = currentLoggedInMember
    ? progressMap[currentLoggedInMember.id]
    : null;

  return (
    <div className="relative min-h-screen flex flex-col font-sans overflow-x-hidden">
      {/* Fondo onírico de partículas de éter */}
      <AstralCanvas />

      {/* Navbar con selector de timezone y controles de sesión */}
      <Navbar
        session={session}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedTimezone={selectedTimezone}
        onTimezoneChange={setSelectedTimezone}
        onOpenMemberModal={() => setIsMemberAuthModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenProfileModal={() => setIsMemberProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pestaña: DASHBOARD / FC */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Banner de Próxima Party Principal (la más próxima para cada persona) */}
            {nextScheduledParty && (
              <UpcomingPartyBanner
                party={nextScheduledParty}
                currentMemberId={session.memberId}
                onConfirmAttendance={handleConfirmAttendance}
              />
            )}

            {/* Hero Card de la FC */}
            <div className="glass-card-glow rounded-3xl p-6 sm:p-8 border border-indigo-500/25 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                      Free Company &bull; Final Fantasy XIV
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                      Raid Ultimate
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight aether-text-gradient">
                    The Weapon&apos;s Refrain (UWU)
                  </h1>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                    Bienvenido al centro de progresión de <strong className="text-cyan-300">Lux Obscura</strong>.
                    Registra tus porcentajes en las 5 fases, define tu disponibilidad y consulta los horarios donde se forman parties con composición óptima (1 MT, 1 OT, 1 Pure Healer, 1 Shield Healer, 2 Melee, 1 Phys Ranged y 1 Caster).
                  </p>
                </div>

                {/* Métricas rápidas */}
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-center p-3.5 rounded-2xl bg-slate-900/60 border border-white/10">
                    <div className="text-xs text-slate-400">Miembros Activos</div>
                    <div className="text-2xl font-bold font-mono text-white mt-0.5">
                      {activeMembersCount}
                    </div>
                  </div>
                  <div className="text-center p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
                    <div className="text-xs text-cyan-300">Progreso FC</div>
                    <div className="text-2xl font-bold font-mono text-cyan-200 mt-0.5">
                      {avgFcScore}{' '}
                      <span className="text-xs font-normal text-slate-400">/ 500</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Si el miembro está conectado, mostrar su propio tracker interactivo */}
            {currentLoggedInMember && currentLoggedInProgress && (
              <div className="glass-card rounded-3xl p-6 border border-cyan-400/40 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Tu Progreso Actual ({currentLoggedInMember.characterName})
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMemberProfileModalOpen(true)}
                    className="text-xs text-cyan-300 hover:text-cyan-200 font-semibold underline"
                  >
                    Editar mis 5 Fases
                  </button>
                </div>
                <UwuPhaseTracker
                  progress={currentLoggedInProgress}
                  canEdit={true}
                  onEditClick={() => setIsMemberProfileModalOpen(true)}
                />
              </div>
            )}

            {/* Roster de Miembros de la FC */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    Roster de Lux Obscura ({filteredMembers.length})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Progreso individual clasificado en las 5 partes de UWU.
                  </p>
                </div>

                {/* Filtros y Búsqueda */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  {/* Búsqueda */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por personaje..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Filtro Rol */}
                  <div className="flex items-center rounded-xl bg-slate-900/80 p-0.5 border border-white/10">
                    {(['ALL', 'TANK', 'HEALER', 'DPS'] as const).map(rf => (
                      <button
                        key={rf}
                        onClick={() => setRoleFilter(rf)}
                        className={`px-2.5 py-1 rounded-lg transition-all font-medium ${
                          roleFilter === rf
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {rf === 'ALL' ? 'Todos' : rf}
                      </button>
                    ))}
                  </div>

                  {/* Orden */}
                  <button
                    onClick={() =>
                      setSortBy(prev =>
                        prev === 'PRIORITY_LOW_FIRST'
                          ? 'HIGH_FIRST'
                          : prev === 'HIGH_FIRST'
                          ? 'NAME'
                          : 'PRIORITY_LOW_FIRST'
                      )
                    }
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white transition-all"
                    title="Alternar orden"
                  >
                    <ArrowUpDown className="w-3 h-3 text-cyan-400" />
                    <span>
                      {sortBy === 'PRIORITY_LOW_FIRST'
                        ? 'Prioridad (Menor %)'
                        : sortBy === 'HIGH_FIRST'
                        ? 'Mayor Progreso'
                        : 'Nombre A-Z'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Grid de Miembros */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMembers.map(m => {
                  const prog = progressMap[m.id] || {
                    memberId: m.id,
                    p1GarudaPct: 0,
                    p2IfritPct: 0,
                    p3TitanPct: 0,
                    p4UltimaPct: 0,
                    p5RoulettePct: 0,
                    overallScore: 0,
                    currentPhaseName: 'Fase 1: Garuda (0%)',
                    updatedAt: new Date().toISOString(),
                  };

                  const isMe = m.id === session.memberId;

                  return (
                    <div
                      key={m.id}
                      className={`glass-card rounded-2xl p-5 border transition-all duration-300 hover:border-cyan-400/40 ${
                        isMe ? 'border-cyan-400/50 bg-cyan-950/20 shadow-[0_0_25px_rgba(56,189,248,0.15)]' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-base">
                              {m.characterName}
                            </span>
                            {isMe && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-semibold">
                                Tú
                              </span>
                            )}
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 font-medium shadow-sm"
                              title={`Ha participado como confirmado en ${attendanceCounts[m.id] ?? 0} incursión(es) oficial(es)`}
                            >
                              {attendanceCounts[m.id] ?? 0} incursión{(attendanceCounts[m.id] ?? 0) === 1 ? '' : 'es'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <JobBadge jobId={m.mainJob} size="sm" isMain={true} />
                            {m.tankStance && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                                {m.tankStance === 'BOTH' ? 'MT / OT' : m.tankStance}
                              </span>
                            )}
                            {m.flexJobs && m.flexJobs.length > 0 && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <span>Flex:</span>
                                {m.flexJobs.map(fj => (
                                  <span
                                    key={fj}
                                    className="font-bold text-slate-300 px-1 py-0.2 rounded bg-slate-900"
                                  >
                                    {fj}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {isMe && (
                          <button
                            onClick={() => setIsMemberProfileModalOpen(true)}
                            className="px-2.5 py-1 text-[11px] rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30 transition-all"
                          >
                            Editar
                          </button>
                        )}
                      </div>

                      {/* Progreso Compacto en las 5 fases */}
                      <UwuPhaseTracker progress={prog} compact={true} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Pestaña: PARTIES & QUÓRUM UWU */}
        {activeTab === 'parties' && (
          <div className="animate-in fade-in duration-300">
            <PartyFinderView
              viableSlotsMap={viableSlotsMap}
              nearMissSlots={nearMissSlots}
              scheduledParties={scheduledParties}
              pastParties={pastParties}
              session={session}
              onAcceptParty={handleAcceptParty}
              onCancelParty={handleCancelParty}
              onConfirmAttendance={handleConfirmAttendance}
            />
          </div>
        )}

        {/* Pestaña: DISPONIBILIDAD */}
        {activeTab === 'availability' && (
          <div className="animate-in fade-in duration-300">
            <AvailabilityGrid
              availabilities={availabilities}
              session={session}
              selectedTimezone={selectedTimezone}
              onSaveAvailability={handleSaveAvailability}
            />
          </div>
        )}

        {/* Pestaña: HISTÓRICO SEMANAL */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-300">
            <HistoricalView
              snapshots={snapshots}
              session={session}
              members={members}
              progressMap={progressMap}
              onTakeSnapshot={handleTakeSnapshot}
              onDeleteSnapshot={handleDeleteSnapshot}
            />
          </div>
        )}
      </main>

      {/* Footer Onírico */}
      <footer className="relative z-10 py-6 border-t border-white/5 text-center text-xs text-slate-500">
        <p>Lux Obscura &bull; Final Fantasy XIV &bull; Ultima Weapon Ultimate Tracker</p>
        <p className="text-[11px] text-slate-600 mt-1">
          Composición Estricta: 1 MT, 1 OT, 1 Pure Healer, 1 Shield Healer, 2 Melee, 1 Phys Ranged, 1 Caster.
        </p>
      </footer>

      {/* Modales */}
      <MemberAuthModal
        isOpen={isMemberAuthModalOpen}
        onClose={() => setIsMemberAuthModalOpen(false)}
        onAuthSuccess={newSession => {
          handleSetSession(newSession);
          loadAllData();
        }}
      />

      {currentLoggedInMember && currentLoggedInProgress && (
        <MemberProfileModal
          isOpen={isMemberProfileModalOpen}
          onClose={() => setIsMemberProfileModalOpen(false)}
          member={currentLoggedInMember}
          progress={currentLoggedInProgress}
          onUpdateSuccess={loadAllData}
        />
      )}

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        session={session}
        members={members}
        onAdminLoginSuccess={() => {
          loadSession();
          loadAllData();
        }}
        onRefreshData={loadAllData}
      />
    </div>
  );
}
