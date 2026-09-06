'use client';

import { useState } from 'react';
import { PartyCombination, ScheduledParty, UserSession, ConfirmationStatus } from '@/types';
import { DAYS_OF_WEEK, formatHourSlot } from '@/lib/timezones';
import JobBadge from './job-badge';
import SlotPartiesBrowser from './slot-parties-browser';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Trash2,
  Award,
  Check,
  X,
  AlertTriangle,
  History,
  Copy,
  Download,
  HandHeart,
  Flame,
  Megaphone,
  MegaphoneOff
} from 'lucide-react';
import { PromotedRecruitment } from '@/types';
import { VolunteerModalTarget } from './modals/party-volunteer-modal';
import { 
  getNextDateForDayOfWeek, 
  getTodayDateString, 
  formatDateToSpanish, 
  getRelativeDateLabel, 
  isPartyExpired, 
  getRemainingConfirmationInfo 
} from '@/lib/date-utils';
import { formatPartyForDiscord } from '@/lib/format-party';
import { SlotDiagnostic, SlotRole } from '@/types';

const ROLE_NAMES: Record<SlotRole, string> = {
  MT: 'Main Tank',
  OT: 'Off Tank',
  PH: 'Pure Healer',
  SH: 'Shield Healer',
  M1: 'Melee DPS (M1)',
  M2: 'Melee DPS (M2)',
  PR: 'Phys Ranged',
  C: 'Caster',
};

function formatMissingSlots(slots: SlotRole[]): string {
  return slots.map(s => ROLE_NAMES[s] ?? s).join(', ');
}

function NearMissSlotCard({
  diag,
  promoted,
  session,
  onVolunteerClick,
  onPromote,
  onClosePromotion,
}: {
  diag: SlotDiagnostic;
  promoted?: PromotedRecruitment;
  session: UserSession;
  onVolunteerClick?: (target: VolunteerModalTarget) => void;
  onPromote?: (diag: SlotDiagnostic) => void;
  onClosePromotion?: (slotKey: string) => void;
}) {
  const dayName = DAYS_OF_WEEK.find(d => d.id === diag.dayOfWeek)?.name || `Día ${diag.dayOfWeek}`;
  const hourLabel = formatHourSlot(diag.hourSlot);
  const slotKey = `${diag.dayOfWeek}_${diag.hourSlot}`;
  const isPromoted = !!promoted && promoted.status === 'OPEN';
  const volunteers = promoted?.volunteers || [];
  const myVolunteer = session.memberId ? volunteers.find(v => v.memberId === session.memberId) : null;

  let badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  let reasonTitle = '';
  let reasonDescription = '';

  if (diag.reason === 'FALTAN_PERSONAS') {
    const missingCount = 8 - diag.availableCount;
    badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    reasonTitle = `Falta${missingCount > 1 ? 'n' : ''} ${missingCount} persona${missingCount > 1 ? 's' : ''}`;
    reasonDescription = diag.missingSlots.length > 0
      ? `Hay ${diag.availableCount} disponibles. Puestos sin cubrir: ${formatMissingSlots(diag.missingSlots)}.`
      : `Hay ${diag.availableCount} disponibles en esta franja.`;
  } else if (diag.reason === 'FALTAN_ROLES') {
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    reasonTitle = 'Faltan roles específicos';
    reasonDescription = `Hay ${diag.availableCount} disponibles, pero nadie puede cubrir: ${formatMissingSlots(diag.missingSlots)}.`;
  } else if (diag.reason === 'JOBS_REPETIDOS') {
    badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    reasonTitle = 'Conflicto de jobs repetidos';
    reasonDescription = 'Los roles están cubiertos, pero se repite un job entre los miembros disponibles.';
  }

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl transition-all shadow-md space-y-3 border ${
        isPromoted
          ? 'bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-950/80 border-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
          : 'bg-slate-900/70 border-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-xl mt-0.5 border ${
              isPromoted
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                : 'bg-slate-800/90 text-cyan-300 border border-white/5'
            }`}
          >
            {isPromoted ? <Flame className="w-4 h-4 text-amber-400 animate-pulse" /> : <Clock className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">
                {dayName} {hourLabel}
              </span>

              {isPromoted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 flex items-center gap-1 shadow-sm">
                  <Flame className="w-3 h-3 text-amber-400" />
                  🔥 Convocatoria Abierta
                </span>
              )}

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                {reasonTitle}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/5 font-medium">
                {diag.availableCount} / 8 disponibles
              </span>
            </div>
            <p className="text-xs text-slate-300/90 mt-1">{reasonDescription}</p>
            {promoted?.notes && (
              <div className="mt-2 text-xs text-amber-200/90 italic bg-amber-950/40 p-2 rounded-lg border border-amber-500/20">
                &ldquo;{promoted.notes}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Acciones y Puestos faltantes */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
          {diag.missingSlots.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mr-1">
              <span className="text-[11px] text-slate-400 font-medium">Falta:</span>
              {diag.missingSlots.map(s => (
                <span
                  key={s}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950/60 text-rose-300 border border-rose-500/30"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Botón ¡Puedo ayudar! para Miembros */}
          {session.memberId && onVolunteerClick && (
            <button
              type="button"
              onClick={() =>
                onVolunteerClick({
                  type: 'INCOMPLETE_SLOT',
                  slotKey,
                  dayOfWeek: diag.dayOfWeek,
                  dayName,
                  hourLabel,
                  missingSlots: diag.missingSlots,
                  notes: promoted?.notes,
                })
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                myVolunteer
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950'
              }`}
            >
              <HandHeart className="w-3.5 h-3.5" />
              <span>{myVolunteer ? '✓ Ayuda ofrecida (Editar)' : '¡Puedo ayudar!'}</span>
            </button>
          )}

          {/* Botones de Administrador para Promover o Cerrar Convocatoria */}
          {session.type === 'ADMIN' && (
            <>
              {isPromoted ? (
                onClosePromotion && (
                  <button
                    type="button"
                    onClick={() => onClosePromotion(slotKey)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-all flex items-center gap-1"
                  >
                    <MegaphoneOff className="w-3 h-3" />
                    <span>Cerrar</span>
                  </button>
                )
              ) : (
                onPromote && (
                  <button
                    type="button"
                    onClick={() => onPromote(diag)}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Promover</span>
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* Lista de Voluntarios Apuntados */}
      {volunteers.length > 0 && (
        <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
            <HandHeart className="w-3.5 h-3.5 text-amber-400" />
            Voluntarios para completar ({volunteers.length}):
          </span>
          {volunteers.map(v => (
            <span
              key={v.id}
              title={v.availabilityNote ? `Nota: ${v.availabilityNote}` : undefined}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200"
            >
              <span className="font-bold text-cyan-300 text-[11px]">{v.assignedRole}</span>
              <span>{v.characterName}</span>
              <JobBadge jobId={v.assignedJob} size="sm" />
              {v.availabilityNote && (
                <span className="text-[10px] text-slate-400 italic max-w-[120px] truncate">
                  · {v.availabilityNote}
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface PartyFinderViewProps {
  viableSlotsMap: Record<string, PartyCombination[]>;
  nearMissSlots?: SlotDiagnostic[];
  scheduledParties: ScheduledParty[];
  pastParties?: ScheduledParty[];
  promotedRecruitments?: PromotedRecruitment[];
  session: UserSession;
  onAcceptParty: (data: {
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
  }) => Promise<void>;
  onCancelParty: (id: string) => Promise<void>;
  onConfirmAttendance?: (partyId: string, memberId: string, status: ConfirmationStatus) => Promise<void>;
  onVolunteerClick?: (target: VolunteerModalTarget) => void;
  onPromoteSlot?: (
    slotKey: string,
    dayOfWeek: number,
    hourSlot: number,
    missingSlots: SlotRole[],
    notes?: string
  ) => Promise<void>;
  onClosePromotion?: (slotKey: string) => Promise<void>;
}

export default function PartyFinderView({
  viableSlotsMap,
  nearMissSlots = [],
  scheduledParties,
  pastParties = [],
  promotedRecruitments = [],
  session,
  onAcceptParty,
  onCancelParty,
  onConfirmAttendance,
  onVolunteerClick,
  onPromoteSlot,
  onClosePromotion,
}: PartyFinderViewProps) {
  const [selectedDay, setSelectedDay] = useState<number | 'ALL'>('ALL');
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});
  const [schedulingParty, setSchedulingParty] = useState<PartyCombination | null>(null);
  const [selectedPartyDate, setSelectedPartyDate] = useState<string>('');
  const [partyNotes, setPartyNotes] = useState('');
  const [partyDuration, setPartyDuration] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPastParties, setShowPastParties] = useState(false);
  const [copyStatusMap, setCopyStatusMap] = useState<Record<string, boolean>>({});
  const [clipboardFallbackText, setClipboardFallbackText] = useState<string | null>(null);

  // Modal para que el admin promueva una franja incompleta
  const [promotingDiag, setPromotingDiag] = useState<SlotDiagnostic | null>(null);
  const [promoteNotes, setPromoteNotes] = useState('');
  const [isPromotingSubmitting, setIsPromotingSubmitting] = useState(false);

  const handleStartPromote = (diag: SlotDiagnostic) => {
    setPromotingDiag(diag);
    setPromoteNotes('');
  };

  const handleConfirmPromote = async () => {
    if (!promotingDiag || !onPromoteSlot) return;
    setIsPromotingSubmitting(true);
    try {
      const slotKey = `${promotingDiag.dayOfWeek}_${promotingDiag.hourSlot}`;
      await onPromoteSlot(
        slotKey,
        promotingDiag.dayOfWeek,
        promotingDiag.hourSlot,
        promotingDiag.missingSlots,
        promoteNotes.trim() || undefined
      );
      setPromotingDiag(null);
    } finally {
      setIsPromotingSubmitting(false);
    }
  };

  const handleCopyDiscord = async (party: ScheduledParty) => {
    const text = formatPartyForDiscord(party);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyStatusMap(prev => ({ ...prev, [party.id]: true }));
        setTimeout(() => {
          setCopyStatusMap(prev => ({ ...prev, [party.id]: false }));
        }, 2500);
        return;
      }
    } catch (err) {
      console.warn('Error al copiar al portapapeles:', err);
    }
    setClipboardFallbackText(text);
  };

  // Filtrar horarios viables según día seleccionado
  const viableEntries = Object.entries(viableSlotsMap).filter(([key]) => {
    if (selectedDay === 'ALL') return true;
    const [day] = key.split('_');
    return Number(day) === selectedDay;
  });

  // Filtrar near-misses según día seleccionado
  const filteredNearMissSlots = (nearMissSlots || []).filter(diag => {
    if (selectedDay === 'ALL') return true;
    return diag.dayOfWeek === selectedDay;
  });


  // Parties vigentes activas (cuyo día y horario no han pasado)
  const activeParties = scheduledParties.filter(p => !isPartyExpired(p) && p.status === 'ACCEPTED');

  // Parties concluidas o pasadas
  const allPastParties = [
    ...pastParties,
    ...scheduledParties.filter(p => isPartyExpired(p) || p.status === 'COMPLETED'),
  ].filter((p, index, self) => index === self.findIndex(t => t.id === p.id));

  const toggleExpand = (slotKey: string) => {
    setExpandedSlots(prev => ({ ...prev, [slotKey]: !prev[slotKey] }));
  };

  const handleOpenScheduleModal = (comb: PartyCombination) => {
    setSchedulingParty(comb);
    // Pre-calcular la fecha calendario más próxima para ese día de la semana
    const nextDate = getNextDateForDayOfWeek(comb.dayOfWeek, comb.hourSlot);
    setSelectedPartyDate(nextDate);
  };

  const handleConfirmSchedule = async () => {
    if (!schedulingParty || !selectedPartyDate) return;
    setIsSubmitting(true);
    try {
      const formattedDateText = formatDateToSpanish(selectedPartyDate, true);
      const startTimeLabel = `${formattedDateText} ${schedulingParty.hourSlot.toString().padStart(2, '0')}:00`;

      const slots = schedulingParty.slots;
      const members = [
        {
          memberId: slots.mt.member.id,
          characterName: slots.mt.member.characterName,
          assignedJob: slots.mt.job,
          assignedRole: 'MT' as const,
          isMainJob: slots.mt.isMainJob,
          confirmationStatus: 'PENDING' as ConfirmationStatus,
        },
        {
          memberId: slots.ot.member.id,
          characterName: slots.ot.member.characterName,
          assignedJob: slots.ot.job,
          assignedRole: 'OT' as const,
          isMainJob: slots.ot.isMainJob,
          confirmationStatus: 'PENDING' as ConfirmationStatus,
        },
        {
          memberId: slots.ph.member.id,
          characterName: slots.ph.member.characterName,
          assignedJob: slots.ph.job,
          assignedRole: 'PH' as const,
          isMainJob: slots.ph.isMainJob,
          confirmationStatus: 'PENDING' as ConfirmationStatus,
        },
        {
          memberId: slots.sh.member.id,
          characterName: slots.sh.member.characterName,
          assignedJob: slots.sh.job,
          assignedRole: 'SH' as const,
          isMainJob: slots.sh.isMainJob,
          confirmationStatus: 'PENDING' as ConfirmationStatus,
        },
        {
          memberId: slots.m1.member.id,
          characterName: slots.m1.member.characterName,
          assignedJob: slots.m1.job,
          assignedRole: 'M1' as const,
          isMainJob: slots.m1.isMainJob,
          confirmationStatus: 'PENDING' as ConfirmationStatus,
        },
        {
          memberId: slots.m2.member.id,
          characterName: slots.m2.member.characterName,
          assignedJob: slots.m2.job,
          assignedRole: 'M2' as const,
          isMainJob: slots.m2.isMainJob,
          confirmationStatus: 'PENDING' as ConfirmationStatus,
        },
        {
          memberId: slots.pr.member.id,
          characterName: slots.pr.member.characterName,
          assignedJob: slots.pr.job,
          assignedRole: 'PR' as const,
          isMainJob: slots.pr.isMainJob,
          confirmationStatus: 'PENDING' as ConfirmationStatus,
        },
        {
          memberId: slots.c.member.id,
          characterName: slots.c.member.characterName,
          assignedJob: slots.c.job,
          assignedRole: 'C' as const,
          isMainJob: slots.c.isMainJob,
          confirmationStatus: 'PENDING' as ConfirmationStatus,
        },
      ];

      await onAcceptParty({
        scheduledDate: selectedPartyDate,
        dayOfWeek: schedulingParty.dayOfWeek,
        hourSlot: schedulingParty.hourSlot,
        startTimeLabel,
        durationHours: partyDuration,
        notes: partyNotes || 'Incursión Oficial Lux Obscura - UWU',
        members,
      });

      setSchedulingParty(null);
      setPartyNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Sección 1: Parties Oficiales Aceptadas (Solo vigentes, las pasadas no aparecen) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Incursiones Oficiales Vigentes
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Parties Aceptadas por el Admin
            </h2>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold">
            {activeParties.length} programada{activeParties.length === 1 ? '' : 's'}
          </span>
        </div>

        {activeParties.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center text-slate-400 border border-white/5">
            <p className="text-sm">No hay parties oficiales activas o por realizarse en este momento.</p>
            {session.type === 'ADMIN' && (
              <p className="text-xs text-amber-300/80 mt-1">
                Explora las combinaciones viables abajo y haz clic en &ldquo;Oficializar Party&rdquo; para agendar una con fecha.
              </p>
            )}
          </div>
        ) : (
          <div className={`grid gap-6 ${activeParties.length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
            {activeParties.map(sp => {
              const dateText = formatDateToSpanish(sp.scheduledDate);
              const relativeLabel = getRelativeDateLabel(sp.scheduledDate);
              const remainingInfo = getRemainingConfirmationInfo(sp.scheduledDate, sp.hourSlot, 5);
              const confirmedCount = sp.members.filter(m => m.confirmationStatus === 'CONFIRMED').length;

              return (
                <div
                  key={sp.id}
                  className="glass-card-glow rounded-3xl p-6 border border-emerald-500/30 relative shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1.5 shadow-sm">
                          <Calendar className="w-3.5 h-3.5" />
                          {dateText || sp.startTimeLabel}
                        </span>
                        {relativeLabel && (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            relativeLabel === '¡Hoy!' 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' 
                              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          }`}>
                            {relativeLabel}
                          </span>
                        )}
                        <span className="text-xs text-slate-300 flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-white/5">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          {sp.hourSlot.toString().padStart(2, '0')}:00 ({sp.durationHours}h)
                        </span>
                      </div>

                      {/* Estado de confirmaciones de la party */}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-500/30 shadow-sm">
                          <Check className="w-4 h-4" />
                          {confirmedCount} / 8 Confirmados
                        </span>
                        {remainingInfo.isOpen ? (
                          <span className="text-amber-300 text-xs flex items-center gap-1 bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-500/20">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            Límite confirmación: {remainingInfo.deadlineLabel} (-5h)
                          </span>
                        ) : (
                          <span className="text-red-400 text-xs flex items-center gap-1 font-semibold bg-red-950/30 px-2.5 py-1 rounded-lg border border-red-500/20">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Límite de confirmación vencido
                          </span>
                        )}
                      </div>

                      {sp.notes && (
                        <p className="text-xs text-slate-300/90 mt-3 italic bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                          &ldquo;{sp.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyDiscord(sp)}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/40 transition-all border border-transparent hover:border-indigo-500/30 flex items-center gap-1 text-xs"
                        title="Copiar composición en formato Discord"
                      >
                        {copyStatusMap[sp.id] ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-300 text-[11px] font-bold">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-indigo-400" />
                            <span className="hidden sm:inline text-[11px] text-slate-300">Discord</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`/api/parties/${sp.id}/calendar.ics`}
                        download={`incursion-uwu-${sp.scheduledDate}.ics`}
                        className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-all border border-transparent hover:border-cyan-500/30 flex items-center gap-1 text-xs"
                        title="Descargar evento de calendario iCalendar (.ics)"
                      >
                        <Download className="w-4 h-4 text-cyan-400" />
                        <span className="hidden sm:inline text-[11px] text-slate-300">.ics</span>
                      </a>

                      {/* Botón ¡Puedo ayudar! para miembros que no están en la party */}
                      {session.memberId && !sp.members.some(m => m.memberId === session.memberId) && onVolunteerClick && (
                        <button
                          type="button"
                          onClick={() => onVolunteerClick({ type: 'SCHEDULED_PARTY', party: sp })}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-teal-500/20 hover:from-cyan-500/30 hover:to-teal-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                          title="Ofrecerme como suplente en caso de que alguien falte"
                        >
                          <HandHeart className="w-3.5 h-3.5" />
                          <span>
                            {sp.volunteers?.some(v => v.memberId === session.memberId)
                              ? '✓ Ayuda ofrecida (Editar)'
                              : '¡Puedo ayudar!'}
                          </span>
                        </button>
                      )}

                      {session.type === 'ADMIN' && (
                        <button
                          onClick={() => onCancelParty(sp.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-all border border-transparent hover:border-red-500/30"
                          title="Cancelar Party"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grilla de los 8 integrantes con tamaño verificado y brillo verde completo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/10">
                    {sp.members.map((m, idx) => {
                      const isConfirmed = m.confirmationStatus === 'CONFIRMED';
                      const isDeclined = m.confirmationStatus === 'DECLINED';
                      const isPending = !isConfirmed && !isDeclined;

                      return (
                        <div 
                          key={idx} 
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[105px] relative overflow-hidden ${
                            isConfirmed
                              ? 'bg-gradient-to-b from-emerald-950/60 via-slate-900/90 to-emerald-950/40 border-emerald-400/70 shadow-[0_0_25px_rgba(16,185,129,0.38)] ring-1 ring-emerald-400/40'
                              : isDeclined
                              ? 'bg-red-950/20 border-red-500/30 opacity-70'
                              : 'bg-slate-900/70 border-white/10 hover:border-white/20'
                          }`}
                        >
                          {/* Resplandor decorativo de cuadro completo para miembros confirmados */}
                          {isConfirmed && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-teal-500/10 pointer-events-none rounded-2xl" />
                          )}

                          <div className="relative z-10">
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800/90 text-indigo-300">
                                {m.assignedRole}
                              </span>
                              <span className="text-xs font-semibold text-white truncate max-w-[125px]" title={m.characterName}>
                                {m.characterName}
                              </span>
                            </div>
                          </div>

                          <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                            <JobBadge jobId={m.assignedJob} size="sm" isMain={m.isMainJob} />

                            {/* Badge de confirmación */}
                            {isConfirmed && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 flex items-center gap-1 shadow-sm">
                                <Check className="w-3 h-3 text-emerald-400" /> Confirmado
                              </span>
                            )}
                            {isDeclined && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                                <X className="w-3 h-3 text-red-400" /> Declinado
                              </span>
                            )}
                            {isPending && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                remainingInfo.isOpen
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium'
                                  : 'bg-red-950/40 text-red-400 border border-red-500/40 font-bold'
                              }`}>
                                {remainingInfo.isOpen ? (
                                  <>
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    <span>Pendiente</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3 h-3 text-red-400" />
                                    <span>Vencido</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>

                          {/* Control de Admin para confirmar manualmente si notificaron por Discord */}
                          {session.type === 'ADMIN' && onConfirmAttendance && (
                            <div className="relative z-10 mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 font-medium">Admin:</span>
                              <div className="flex items-center gap-1">
                                {!isConfirmed && (
                                  <button
                                    onClick={() => onConfirmAttendance(sp.id, m.memberId, 'CONFIRMED')}
                                    className="px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 transition-all"
                                    title="Confirmar por Admin"
                                  >
                                    <Check className="w-2.5 h-2.5" /> Confirmar
                                  </button>
                                )}
                                {!isDeclined && (
                                  <button
                                    onClick={() => onConfirmAttendance(sp.id, m.memberId, 'DECLINED')}
                                    className="px-2 py-0.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 flex items-center gap-1 transition-all"
                                    title="Declinar por Admin"
                                  >
                                    <X className="w-2.5 h-2.5" /> Declinar
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Lista de Suplentes Listos para esta Party */}
                  {sp.volunteers && sp.volunteers.length > 0 && (
                    <div className="mt-3.5 p-3 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                          <HandHeart className="w-3.5 h-3.5 text-cyan-400" />
                          Suplentes listos ({sp.volunteers.length}):
                        </span>
                        {sp.volunteers.map(v => (
                          <span
                            key={v.id}
                            title={v.availabilityNote ? `Nota: ${v.availabilityNote}` : undefined}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200"
                          >
                            <span className="font-bold text-indigo-300 text-[11px]">{v.assignedRole}</span>
                            <span>{v.characterName}</span>
                            <JobBadge jobId={v.assignedJob} size="sm" />
                            {v.availabilityNote && (
                              <span className="text-[10px] text-slate-400 italic max-w-[140px] truncate">
                                · {v.availabilityNote}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sección Colapsable: Historial de Incursiones Pasadas o Concluidas */}
        {allPastParties.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/5">
            <button
              onClick={() => setShowPastParties(!showPastParties)}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-all font-medium py-1 px-3 rounded-xl bg-slate-900/60 border border-white/5"
            >
              <History className="w-4 h-4 text-indigo-400" />
              <span>Ver Historial de Incursiones Anteriores ({allPastParties.length})</span>
              {showPastParties ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showPastParties && (
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in duration-200">
                {allPastParties.map(pp => (
                  <div
                    key={pp.id}
                    className="glass-card rounded-2xl p-4 border border-white/10 opacity-75 hover:opacity-100 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {formatDateToSpanish(pp.scheduledDate, true) || pp.startTimeLabel}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5 font-semibold">
                          Concluida / Pasada
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {pp.hourSlot.toString().padStart(2, '0')}:00 ({pp.durationHours}h)
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-[11px] text-slate-300">
                      {pp.members.map((m, idx) => (
                        <div key={idx} className="truncate p-1 bg-slate-950/40 rounded text-[10px]">
                          <span className="text-indigo-400 font-bold">{m.assignedRole}:</span> {m.characterName}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sección 2: Buscador de Parties Disponibles (Con algoritmos de prioridad) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Detector Inteligente de Quórum
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Horarios Viables para Formar Party (8/8)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Prioridad principal: <strong className="text-cyan-300">Menor progreso en UWU</strong> + <strong className="text-cyan-300">Más Main Jobs</strong>.
            </p>
          </div>

          {/* Filtro por Día */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-2xl bg-slate-900/60 border border-white/10 text-xs">
            <button
              onClick={() => setSelectedDay('ALL')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                selectedDay === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            {DAYS_OF_WEEK.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDay(d.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  selectedDay === d.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d.short}
              </button>
            ))}
          </div>
        </div>

        {viableEntries.length === 0 ? (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-8 text-center border border-white/5">
              <AlertCircle className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-70" />
              <h3 className="text-base font-semibold text-slate-300">
                No hay horarios con 8 roles completos para el filtro seleccionado
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Se requiere que coincidan 8 miembros que cubran exactamente: 1 MT, 1 OT, 1 Pure Healer, 1 Shield Healer, 2 Melees distintos, 1 Phys Ranged y 1 Caster, sin repetir jobs.
              </p>
            </div>

            {/* Diagnóstico de roles / Franjas cercanas al quórum */}
            {filteredNearMissSlots.length > 0 && (
              <div className="glass-card rounded-3xl p-6 border border-cyan-500/20 shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Franjas más cercanas al quórum (Diagnóstico de roles)
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Horarios con 6 o más miembros disponibles donde pequeños ajustes en disponibilidad o flex jobs podrían desbloquear una incursión:
                </p>
                <div className="space-y-2.5">
                  {filteredNearMissSlots.map(diag => {
                    const slotKey = `${diag.dayOfWeek}_${diag.hourSlot}`;
                    const promoted = promotedRecruitments.find(r => r.slotKey === slotKey && r.status === 'OPEN');
                    return (
                      <NearMissSlotCard
                        key={slotKey}
                        diag={diag}
                        promoted={promoted}
                        session={session}
                        onVolunteerClick={onVolunteerClick}
                        onPromote={handleStartPromote}
                        onClosePromotion={onClosePromotion}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {viableEntries.map(([slotKey, combinations]) => {
              const [dayStr, hourStr] = slotKey.split('_');
              const dayOfWeek = Number(dayStr);
              const hourSlot = Number(hourStr);
              const dayName = DAYS_OF_WEEK.find(d => d.id === dayOfWeek)?.name || 'Día';
              const hourLabel = formatHourSlot(hourSlot);

              const topCombination = combinations[0]; // La de mayor prioridad según el algoritmo
              const isExpanded = !!expandedSlots[slotKey];

              return (
                <div
                  key={slotKey}
                  className="glass-card rounded-3xl p-5 sm:p-6 border border-cyan-500/20 shadow-xl transition-all"
                >
                  {/* Encabezado del Horario */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-400/30 text-cyan-300">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">
                            {dayName} {hourLabel}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-400/30">
                            {combinations.length} combinación{combinations.length === 1 ? '' : 'es'} viable{combinations.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Todos los 8 roles cubiertos sin repetir jobs
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {session.type === 'ADMIN' && (
                        <button
                          onClick={() => handleOpenScheduleModal(topCombination)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Oficializar Party Recomendada
                        </button>
                      )}

                      {combinations.length > 1 && (
                        <button
                          onClick={() => toggleExpand(slotKey)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-300 hover:text-white transition-all"
                        >
                          <span>{isExpanded ? 'Ocultar explorador' : `Ver todas (${combinations.length})`}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Party #1 Prioritaria Destacada */}
                  <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-cyan-950/25 to-slate-950/40 border border-cyan-400/30 shadow-inner">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          <Award className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                          Opción #1: Prioridad de Menor Progreso
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-300 font-mono">
                        <span>
                          Progreso prom: <strong className="text-cyan-300">{topCombination.avgProgressScore} / 500</strong>
                        </span>
                        <span>
                          Main Jobs: <strong className="text-emerald-400">{topCombination.mainJobsCount} / 8</strong>
                        </span>
                      </div>
                    </div>

                    {/* Grilla de los 8 slots de la combinación prioritaria */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      {Object.values(topCombination.slots).map((slot, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 hover:border-cyan-400/30 transition-all"
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-indigo-300 text-[11px] px-1.5 py-0.5 rounded bg-slate-800">
                              {slot.slotRole}
                            </span>
                            <span className="font-semibold text-white truncate max-w-[120px]">
                              {slot.member.characterName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <JobBadge jobId={slot.job} size="sm" isMain={slot.isMainJob} />
                            {/* El progreso con el que entra a ESTE puesto: quien lleva
                                progreso por rol puede valer distinto en cada uno. */}
                            <span
                              className="text-[10px] font-mono text-slate-400"
                              title={`Progreso en el rol de este puesto: ${slot.progressScore} / 500`}
                            >
                              {slot.progressScore}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vista de Todas las Parties con Paginación y Filtros */}
                  {isExpanded && combinations.length > 1 && (
                    <div className="mt-5 pt-4 border-t border-white/10 animate-in fade-in duration-200">
                      <SlotPartiesBrowser
                        combinations={combinations}
                        slotKey={slotKey}
                        dayName={dayName}
                        hourLabel={hourLabel}
                        session={session}
                        onSchedule={handleOpenScheduleModal}
                        onCopySuccess={text => setClipboardFallbackText(text)}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Si además hay franjas cercanas al quórum, mostrarlas para informar de otras opciones potenciales */}
            {filteredNearMissSlots.length > 0 && (
              <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-lg space-y-4 mt-8">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      Otras franjas próximas al quórum ({filteredNearMissSlots.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">6+ disponibles sin party completa</span>
                </div>
                <p className="text-xs text-slate-400">
                  Franjas con alta afluencia que podrían convertirse en raid con pequeños ajustes de disponibilidad o roles:
                </p>
                <div className="space-y-2.5">
                  {filteredNearMissSlots.map(diag => {
                    const slotKey = `${diag.dayOfWeek}_${diag.hourSlot}`;
                    const promoted = promotedRecruitments.find(r => r.slotKey === slotKey && r.status === 'OPEN');
                    return (
                      <NearMissSlotCard
                        key={slotKey}
                        diag={diag}
                        promoted={promoted}
                        session={session}
                        onVolunteerClick={onVolunteerClick}
                        onPromote={handleStartPromote}
                        onClosePromotion={onClosePromotion}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para Oficializar y Agendar Party (Admin) con Fecha Concreta */}
      {schedulingParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-card-glow rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSchedulingParty(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Oficializar Incursión UWU</h3>
                <p className="text-xs text-slate-400">
                  Agendarás esta raid con fecha calendario y los miembros deberán confirmar asistencia.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Selector de Fecha de Incursión */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Fecha de la Incursión <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="date"
                  value={selectedPartyDate}
                  onChange={e => setSelectedPartyDate(e.target.value)}
                  min={getTodayDateString()}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
                {selectedPartyDate && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-cyan-300 bg-cyan-950/30 p-2 rounded-lg border border-cyan-500/20">
                    <span>📅 {formatDateToSpanish(selectedPartyDate)} - {schedulingParty.hourSlot.toString().padStart(2, '0')}:00</span>
                    <span className="font-semibold text-amber-300">{getRelativeDateLabel(selectedPartyDate)}</span>
                  </div>
                )}
              </div>

              {/* Aviso de límite de 5 horas para confirmación */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[11px] text-amber-300">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Plazo de confirmación:</strong> Los miembros asignados tendrán hasta <strong>5 horas antes del inicio</strong> para confirmar su asistencia. Si no confirman a tiempo, se marcarán como vencidos.
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Duración Estimada (Horas)</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={partyDuration}
                  onChange={e => setPartyDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notas o Enfoque de la Incursión</label>
                <textarea
                  rows={3}
                  value={partyNotes}
                  onChange={e => setPartyNotes(e.target.value)}
                  placeholder="Ej: Enfoque en progresión de Fase 3 Titan y práctica de bomb boulders..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Lista compacta de los 8 confirmados */}
              <div>
                <span className="block text-slate-400 font-semibold mb-1.5">
                  8 Miembros Asignados (Convocados):
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-slate-950/60 border border-white/5">
                  {Object.values(schedulingParty.slots).map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] px-2 py-1 bg-slate-900 rounded">
                      <span className="text-white truncate">{s.member.characterName}</span>
                      <span className="text-cyan-300 font-bold text-[10px]">{s.job} ({s.slotRole})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSchedulingParty(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting || !selectedPartyDate}
                onClick={handleConfirmSchedule}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar y Agendar Incursión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para que el Admin promueva una franja incompleta como convocatoria */}
      {promotingDiag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 border border-amber-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Promover Convocatoria</h4>
                  <p className="text-xs text-slate-400">
                    {DAYS_OF_WEEK.find(d => d.id === promotingDiag.dayOfWeek)?.name} a las{' '}
                    {formatHourSlot(promotingDiag.hourSlot)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPromotingDiag(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-xs space-y-1.5">
              <div className="text-slate-300 font-medium">
                Puestos necesarios para completar 8/8:
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {promotingDiag.missingSlots.map(s => (
                  <span
                    key={s}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950/60 text-rose-300 border border-rose-500/30"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1">
                Mensaje o Enfoque para la FC (Opcional):
              </label>
              <textarea
                rows={3}
                value={promoteNotes}
                onChange={e => setPromoteNotes(e.target.value)}
                placeholder="Ej: ¡Buscamos 1 Pure Healer y 1 Caster para completar este horario! ¡Apúntense con '¡Puedo ayudar!'!"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPromotingDiag(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPromotingSubmitting}
                onClick={handleConfirmPromote}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Megaphone className="w-4 h-4" />
                <span>{isPromotingSubmitting ? 'Promoviendo...' : 'Abrir Convocatoria'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de fallback para copiar manualmente si el portapapeles del navegador no tiene permisos */}
      {clipboardFallbackText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="glass-card rounded-3xl p-6 border border-cyan-500/40 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Copy className="w-4 h-4 text-cyan-400" />
                Copiar alineación para Discord
              </h4>
              <button
                type="button"
                onClick={() => setClipboardFallbackText(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Tu navegador requiere que selecciones y copies el texto manualmente:
            </p>
            <textarea
              readOnly
              rows={8}
              value={clipboardFallbackText}
              onFocus={e => e.target.select()}
              className="w-full font-mono text-xs p-3 rounded-xl bg-slate-900 border border-white/10 text-slate-200 focus:outline-none focus:border-cyan-400"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setClipboardFallbackText(null)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
