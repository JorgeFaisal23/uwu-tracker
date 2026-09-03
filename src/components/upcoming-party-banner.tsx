'use client';

import { useState } from 'react';
import { ScheduledParty, ConfirmationStatus } from '@/types';
import JobBadge from './job-badge';
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Check, 
  X, 
  ShieldAlert,
  Users
} from 'lucide-react';
import { 
  formatDateToSpanish, 
  getRelativeDateLabel, 
  getRemainingConfirmationInfo,
  isConfirmationWindowOpen 
} from '@/lib/date-utils';

interface UpcomingPartyBannerProps {
  party: ScheduledParty;
  currentMemberId?: string;
  isAdmin?: boolean;
  onConfirmAttendance?: (partyId: string, memberId: string, status: ConfirmationStatus) => Promise<void>;
}

export default function UpcomingPartyBanner({ 
  party, 
  currentMemberId, 
  isAdmin,
  onConfirmAttendance 
}: UpcomingPartyBannerProps) {
  const [submittingStatus, setSubmittingStatus] = useState<string | null>(null);

  const isCurrentMemberIncluded = party.members.some(m => m.memberId === currentMemberId);
  const mySlot = party.members.find(m => m.memberId === currentMemberId);

  const confirmedCount = party.members.filter(m => m.confirmationStatus === 'CONFIRMED').length;
  const declinedCount = party.members.filter(m => m.confirmationStatus === 'DECLINED').length;
  const pendingCount = party.members.filter(m => m.confirmationStatus === 'PENDING' || !m.confirmationStatus).length;

  const dateFormatted = formatDateToSpanish(party.scheduledDate);
  const relativeDate = getRelativeDateLabel(party.scheduledDate);
  const remainingInfo = getRemainingConfirmationInfo(party.scheduledDate, party.hourSlot, 5);
  const isWindowOpen = remainingInfo.isOpen;

  const handleAction = async (status: ConfirmationStatus) => {
    if (!currentMemberId || !onConfirmAttendance) return;
    try {
      setSubmittingStatus(status);
      await onConfirmAttendance(party.id, currentMemberId, status);
    } finally {
      setSubmittingStatus(null);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl glass-card-glow p-6 sm:p-8 border border-cyan-500/30 shadow-[0_0_50px_rgba(56,189,248,0.15)] my-6">
      {/* Resplandor decorativo de éter */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Encabezado Superior */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold">
                  Próxima Incursión Oficial de la FC
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Aceptada por Admin
                </span>
                {relativeDate && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                    relativeDate === '¡Hoy!' 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {relativeDate}
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide mt-1">
                The Weapon&apos;s Refrain (Ultimate)
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-200 shadow-sm">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white">
                {dateFormatted || party.startTimeLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-200 shadow-sm">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>{party.hourSlot.toString().padStart(2, '0')}:00 ({party.durationHours}h)</span>
            </div>
          </div>
        </div>

        {/* Barra de Estado de Confirmaciones y Límite de 5 Horas */}
        <div className="my-4 p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-300 font-medium">Asistencia:</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {confirmedCount} / 8 Confirmados
              </span>
              {pendingCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {pendingCount} Pendiente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
              {declinedCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  {declinedCount} Declinado{declinedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {isWindowOpen ? (
              <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-500/30">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                <span>
                  Confirmar antes de: <strong>{remainingInfo.deadlineLabel}</strong> (Límite: 5h antes)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-red-300 bg-red-950/40 px-3 py-1 rounded-xl border border-red-500/30">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span>Plazo límite de confirmación (5h antes del inicio) ha vencido</span>
              </div>
            )}
          </div>
        </div>

        {/* Módulo Interactivo para el Jugador Convocado */}
        {isCurrentMemberIncluded && mySlot && (
          <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-cyan-950/40 to-slate-900/60 border border-cyan-400/30">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold text-sm">¡Estás convocado a esta raid!</span>
                  <span className="text-xs text-slate-300">
                    Rol: <strong className="text-white">{mySlot.assignedRole}</strong>
                  </span>
                  <JobBadge jobId={mySlot.assignedJob} size="sm" isMain={mySlot.isMainJob} />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Tu estado actual:{' '}
                  <strong className={
                    mySlot.confirmationStatus === 'CONFIRMED'
                      ? 'text-emerald-400'
                      : mySlot.confirmationStatus === 'DECLINED'
                      ? 'text-red-400'
                      : 'text-amber-400'
                  }>
                    {mySlot.confirmationStatus === 'CONFIRMED'
                      ? 'Confirmado ✓'
                      : mySlot.confirmationStatus === 'DECLINED'
                      ? 'Declinado ✗'
                      : 'Pendiente de confirmación'}
                  </strong>
                </p>
              </div>

              {/* Botones de Confirmación */}
              {onConfirmAttendance && (
                <div className="flex items-center gap-2">
                  {isWindowOpen ? (
                    <>
                      {mySlot.confirmationStatus !== 'CONFIRMED' && (
                        <button
                          onClick={() => handleAction('CONFIRMED')}
                          disabled={submittingStatus !== null}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>{submittingStatus === 'CONFIRMED' ? 'Confirmando...' : 'Confirmar Asistencia'}</span>
                        </button>
                      )}

                      {mySlot.confirmationStatus !== 'DECLINED' && (
                        <button
                          onClick={() => handleAction('DECLINED')}
                          disabled={submittingStatus !== null}
                          className="px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-white/10 hover:border-red-500/30 text-xs font-medium transition-all flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          <span>{submittingStatus === 'DECLINED' ? 'Procesando...' : 'No podré asistir'}</span>
                        </button>
                      )}

                      {mySlot.confirmationStatus === 'CONFIRMED' && (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4" /> Asistencia Confirmada
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      El plazo para confirmar expiró 5 horas antes de la raid.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notas de la Incursión */}
        {party.notes && (
          <p className="text-sm text-slate-300/90 my-4 italic bg-slate-950/40 p-3 rounded-xl border border-white/5">
            &ldquo;{party.notes}&rdquo;
          </p>
        )}

        {/* Alineación de los 8 Jugadores Convocados con sus estados de confirmación */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            <span>Composición y Asistencia (8 miembros)</span>
            <span className="text-[11px] font-normal lowercase tracking-normal text-slate-500">
              límite: 5h antes de inicio
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {party.members.map((slot, idx) => {
              const isConfirmed = slot.confirmationStatus === 'CONFIRMED';
              const isDeclined = slot.confirmationStatus === 'DECLINED';
              const isPending = !isConfirmed && !isDeclined;
              const isMe = slot.memberId === currentMemberId;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[105px] relative overflow-hidden ${
                    isConfirmed
                      ? isMe
                        ? 'bg-gradient-to-b from-emerald-950/70 via-slate-900/90 to-emerald-950/50 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400/70'
                        : 'bg-gradient-to-b from-emerald-950/60 via-slate-900/90 to-emerald-950/40 border-emerald-400/70 shadow-[0_0_25px_rgba(16,185,129,0.38)] ring-1 ring-emerald-400/40'
                      : isMe
                      ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_0_18px_rgba(56,189,248,0.25)] ring-1 ring-cyan-400/30'
                      : isDeclined
                      ? 'bg-red-950/20 border-red-500/30 opacity-70'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Resplandor decorativo de cuadro completo para confirmados */}
                  {isConfirmed && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-teal-500/10 pointer-events-none rounded-2xl" />
                  )}

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800/90 text-indigo-300">
                        {slot.assignedRole}
                      </span>
                      <span className="text-xs font-semibold text-white truncate max-w-[125px]">
                        {slot.characterName}
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <JobBadge jobId={slot.assignedJob} size="sm" isMain={slot.isMainJob} />

                    {/* Badge de confirmación */}
                    {isConfirmed && (
                      <span 
                        className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        title="Asistencia confirmada a tiempo"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Confirmado</span>
                      </span>
                    )}

                    {isDeclined && (
                      <span 
                        className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30"
                        title="Declinó asistencia"
                      >
                        <X className="w-3 h-3 text-red-400" />
                        <span>Declinado</span>
                      </span>
                    )}

                    {isPending && (
                      <span 
                        className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          isWindowOpen 
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                            : 'bg-red-950/40 text-red-400 border border-red-500/40 font-bold'
                        }`}
                        title={isWindowOpen ? 'Pendiente de confirmación' : 'No confirmó dentro del límite de 5h'}
                      >
                        {isWindowOpen ? (
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
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
