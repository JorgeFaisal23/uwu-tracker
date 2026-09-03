'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Member, 
  UwuProgress, 
  MemberAvailability, 
  PartyCombination, 
  ScheduledParty, 
  WeeklyFcSnapshot, 
  UserSession,
  ConfirmationStatus 
} from '@/types';
import { isPartyExpired } from '@/lib/date-utils';
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
import { 
  Sparkles, 
  Users, 
  Search, 
  Filter, 
  Award, 
  TrendingUp, 
  ShieldCheck, 
  ArrowUpDown 
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'parties' | 'availability' | 'history'>('dashboard');
  const [selectedTimezone, setSelectedTimezone] = useState('America/Mexico_City');
  const [session, setSession] = useState<UserSession>({ type: 'GUEST' });

  // Datos globales
  const [members, setMembers] = useState<Member[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, UwuProgress>>({});
  const [availabilities, setAvailabilities] = useState<MemberAvailability[]>([]);
  const [viableSlotsMap, setViableSlotsMap] = useState<Record<string, PartyCombination[]>>({});
  const [scheduledParties, setScheduledParties] = useState<ScheduledParty[]>([]);
  const [pastParties, setPastParties] = useState<ScheduledParty[]>([]);
  const [snapshots, setSnapshots] = useState<WeeklyFcSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros en dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TANK' | 'HEALER' | 'DPS'>('ALL');
  const [sortBy, setSortBy] = useState<'PRIORITY_LOW_FIRST' | 'HIGH_FIRST' | 'NAME'>('PRIORITY_LOW_FIRST');

  // Modales
  const [isMemberAuthModalOpen, setIsMemberAuthModalOpen] = useState(false);
  const [isMemberProfileModalOpen, setIsMemberProfileModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Cargar datos
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [membersRes, partiesRes, availRes, historyRes] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/parties'),
        fetch('/api/availability'),
        fetch('/api/history'),
      ]);

      if (membersRes.ok) {
        const mData = await membersRes.json();
        setMembers(mData.members || []);
        setProgressMap(mData.progressMap || {});
      }

      if (partiesRes.ok) {
        const pData = await partiesRes.json();
        setViableSlotsMap(pData.viableSlotsMap || {});
        setScheduledParties(pData.scheduledParties || []);
        setPastParties(pData.pastParties || []);
      }

      if (availRes.ok) {
        const aData = await availRes.json();
        setAvailabilities(aData.availabilities || []);
      }

      if (historyRes.ok) {
        const hData = await historyRes.json();
        setSnapshots(hData.snapshots || []);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();

    // Recuperar sesión guardada en localStorage si existe
    const savedSession = localStorage.getItem('uwu_tracker_session');
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch {
        localStorage.removeItem('uwu_tracker_session');
      }
    }
  }, [loadAllData]);

  const handleSetSession = (newSession: UserSession) => {
    setSession(newSession);
    localStorage.setItem('uwu_tracker_session', JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession({ type: 'GUEST' });
    localStorage.removeItem('uwu_tracker_session');
  };

  // Guardar disponibilidad de usuario
  const handleSaveAvailability = async (slots: { dayOfWeek: number; hourSlot: number }[]) => {
    if (!session.memberId) return;
    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: session.memberId,
        slots,
      }),
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
    status: ConfirmationStatus,
    isAdminOverride = false
  ) => {
    try {
      const res = await fetch('/api/parties/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyId,
          memberId,
          status,
          isAdminOverride: session.type === 'ADMIN' || isAdminOverride,
        }),
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

  // Tomar snapshot histórico semanal (Admin)
  const handleTakeSnapshot = async () => {
    const res = await fetch('/api/history', { method: 'POST' });
    if (res.ok) {
      await loadAllData();
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

  // Próxima party aceptada (la más próxima en el tiempo que NO haya expirado)
  const activeScheduledParties = scheduledParties.filter(p => !isPartyExpired(p));
  activeScheduledParties.sort((a, b) => {
    const timeA = new Date(`${a.scheduledDate}T${a.hourSlot.toString().padStart(2, '0')}:00:00`).getTime();
    const timeB = new Date(`${b.scheduledDate}T${b.hourSlot.toString().padStart(2, '0')}:00:00`).getTime();
    return timeA - timeB;
  });
  const nextScheduledParty = activeScheduledParties.length > 0 ? activeScheduledParties[0] : null;

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
        {/* Banner de Próxima Party Oficial Aceptada */}
        {nextScheduledParty && (
          <UpcomingPartyBanner
            party={nextScheduledParty}
            currentMemberId={session.memberId}
            isAdmin={session.type === 'ADMIN'}
            onConfirmAttendance={handleConfirmAttendance}
          />
        )}

        {/* Pestaña: DASHBOARD / NEXO FC */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-300">
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
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base">
                              {m.characterName}
                            </span>
                            {isMe && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-semibold">
                                Tú
                              </span>
                            )}
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
              members={members}
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
              onTakeSnapshot={handleTakeSnapshot}
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
          handleSetSession({ type: 'ADMIN', characterName: 'Administrador' });
          loadAllData();
        }}
        onRefreshData={loadAllData}
      />
    </div>
  );
}
