'use client';

import { useState, useMemo } from 'react';
import { WeeklyFcSnapshot, UserSession, Member, UwuProgress } from '@/types';
import {
  TrendingUp,
  Award,
  Calendar,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle,
  X,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { getCalendarWeek, getCalendarWeekRange } from '@/lib/date-utils';

interface HistoricalViewProps {
  snapshots: WeeklyFcSnapshot[];
  session: UserSession;
  members?: Member[];
  progressMap?: Record<string, UwuProgress>;
  onTakeSnapshot: (params?: { year?: number; weekNumber?: number }) => Promise<void>;
  onDeleteSnapshot?: (year: number, weekNumber: number) => Promise<void>;
}

export default function HistoricalView({
  snapshots,
  session,
  members = [],
  progressMap = {},
  onTakeSnapshot,
  onDeleteSnapshot,
}: HistoricalViewProps) {
  // Semana actual en curso del calendario civil
  const currentCalendarWeek = useMemo(() => getCalendarWeek(), []);

  // Clave compuesta año_semana para selección inequívoca
  const initialKey = snapshots.length > 0
    ? `${snapshots[0].year}_${snapshots[0].weekNumber}`
    : `${currentCalendarWeek.year}_${currentCalendarWeek.weekNumber}`;

  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(initialKey);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // Comprobar si la semana actual del calendario ya fue aceptada y guardada
  const currentWeekSnapshot = snapshots.find(
    s => s.year === currentCalendarWeek.year && s.weekNumber === currentCalendarWeek.weekNumber
  );
  const isCurrentWeekAccepted = !!currentWeekSnapshot;

  // Snapshot seleccionado para ver
  const activeSnapshot = snapshots.find(
    s => `${s.year}_${s.weekNumber}` === selectedWeekKey
  ) || snapshots[0];

  // Cálculo de resumen en vivo para la confirmación de aceptación
  const liveStats = useMemo(() => {
    const activeMembers = members;
    let totalScore = 0;
    for (const m of activeMembers) {
      totalScore += progressMap[m.id]?.overallScore ?? 0;
    }
    const avgScore = activeMembers.length > 0 ? Math.round(totalScore / activeMembers.length) : 0;
    return {
      memberCount: activeMembers.length,
      averageScore: avgScore,
    };
  }, [members, progressMap]);

  // Manejador para confirmar y aceptar la semana actual
  const handleConfirmAcceptWeek = async () => {
    setIsSubmitting(true);
    try {
      await onTakeSnapshot({
        year: currentCalendarWeek.year,
        weekNumber: currentCalendarWeek.weekNumber,
      });
      setSelectedWeekKey(`${currentCalendarWeek.year}_${currentCalendarWeek.weekNumber}`);
      setIsAcceptModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejador para eliminar una semana del histórico
  const handleDelete = async (year: number, weekNumber: number) => {
    if (!onDeleteSnapshot) return;
    if (!confirm(`¿Deseas eliminar la Semana ${weekNumber} (${year}) del registro histórico? Solo el admin puede deshacer esto.`)) {
      return;
    }
    const key = `${year}_${weekNumber}`;
    setDeletingKey(key);
    try {
      await onDeleteSnapshot(year, weekNumber);
      // Ajustar selección al primer snapshot restante si se borró el activo
      const remaining = snapshots.filter(s => !(s.year === year && s.weekNumber === weekNumber));
      if (remaining.length > 0) {
        setSelectedWeekKey(`${remaining[0].year}_${remaining[0].weekNumber}`);
      }
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Evolución Temporal de la FC
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
            Registro Histórico Semanal
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitorea el avance de la Free Company a la par de las semanas del calendario civil.
          </p>
        </div>
      </div>

      {/* Banner de Estado de la Semana Actual del Calendario */}
      <div className="relative overflow-hidden rounded-3xl glass-card-glow p-6 sm:p-7 border border-indigo-500/30">
        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-indigo-300 font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Semana Actual del Calendario
              </span>

              {isCurrentWeekAccepted ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Aceptada y Archivada por Admin
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold flex items-center gap-1 border border-amber-500/30 animate-pulse">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Pendiente de Aceptación por el Admin
                </span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Semana {currentCalendarWeek.weekNumber} &bull; {currentCalendarWeek.formattedRange}
            </h3>

            <p className="text-xs text-slate-400 max-w-2xl">
              {isCurrentWeekAccepted
                ? `Esta semana civil ya está registrada en el histórico permanente (archivada el ${new Date(currentWeekSnapshot.recordedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}). Solo las semanas aceptadas por el admin se conservan.`
                : 'El registro semanal solo guarda las semanas del calendario que el administrador acepte y confirme explícitamente.'}
            </p>
          </div>

          {/* Botones de Acción para el Administrador */}
          {session.type === 'ADMIN' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAcceptModalOpen(true)}
                disabled={isSubmitting}
                className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg ${
                  isCurrentWeekAccepted
                    ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-cyan-400/40'
                    : 'bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-600 text-white shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                }`}
              >
                {isCurrentWeekAccepted ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                    <span>Actualizar Foto de la Semana {currentCalendarWeek.weekNumber}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Aceptar y Guardar Semana {currentCalendarWeek.weekNumber}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selector de Semanas Guardadas y Aceptadas */}
      {snapshots.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Semanas Aceptadas por el Admin ({snapshots.length})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
            {snapshots.map(s => {
              const key = `${s.year}_${s.weekNumber}`;
              const isSelected = selectedWeekKey === key || (!snapshots.some(item => `${item.year}_${item.weekNumber}` === selectedWeekKey) && snapshots[0] === s);
              const dateRange = s.formattedRange || getCalendarWeekRange(s.year, s.weekNumber).formattedRange;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedWeekKey(key)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(56,189,248,0.3)] border border-cyan-300/40'
                      : 'bg-slate-900/60 text-slate-400 border border-white/5 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <div className="flex flex-col text-left">
                    <span>Semana {s.weekNumber}</span>
                    <span className="text-[10px] font-normal opacity-80">{dateRange}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    ✓
                  </span>
                </button>
              );
            })}
          </div>

          {activeSnapshot && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Encabezado del Snapshot Activo */}
              <div className="flex flex-wrap items-center justify-between gap-4 glass-card rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        Semana {activeSnapshot.weekNumber} &bull; {activeSnapshot.formattedRange || getCalendarWeekRange(activeSnapshot.year, activeSnapshot.weekNumber).formattedRange}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Aceptada por Admin
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Archivada el {new Date(activeSnapshot.recordedAt).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {session.type === 'ADMIN' && onDeleteSnapshot && (
                  <button
                    onClick={() => handleDelete(activeSnapshot.year, activeSnapshot.weekNumber)}
                    disabled={deletingKey === `${activeSnapshot.year}_${activeSnapshot.weekNumber}`}
                    className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 disabled:opacity-50"
                    title="Eliminar semana del registro histórico"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Semana</span>
                  </button>
                )}
              </div>

              {/* Tarjetas de Resumen de la Semana */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card rounded-2xl p-5 border border-cyan-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Progreso Promedio FC</span>
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-cyan-300 mt-2">
                    {activeSnapshot.averageScore}{' '}
                    <span className="text-xs text-slate-400 font-normal">/ 500 pts</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Equivalente al {Math.round((activeSnapshot.averageScore / 500) * 100)}% de UWU
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Miembros Registrados</span>
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-purple-300 mt-2">
                    {activeSnapshot.memberSnapshots.length}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Participando activamente en la raid
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Fase Más Alta Alcanzada</span>
                    <Award className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-emerald-300 mt-2">
                    {activeSnapshot.phaseDistribution.cleared > 0
                      ? '¡UWU CLEARED!'
                      : activeSnapshot.phaseDistribution.enrage > 0
                      ? 'Fase 5: Enrage'
                      : activeSnapshot.phaseDistribution.ultima > 0
                      ? 'Fase 4: Ultima'
                      : activeSnapshot.phaseDistribution.titan > 0
                      ? 'Fase 3: Titan'
                      : 'Fase 2: Ifrit'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Rango civil: {activeSnapshot.formattedRange || getCalendarWeekRange(activeSnapshot.year, activeSnapshot.weekNumber).formattedRange}
                  </div>
                </div>
              </div>

              {/* Distribución de la FC por Fase */}
              <div className="glass-card rounded-2xl p-6 border border-white/10">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                  Distribución de Miembros por Fase (Semana {activeSnapshot.weekNumber})
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <div className="text-xs text-emerald-300 font-semibold">F1: Garuda</div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {activeSnapshot.phaseDistribution.garuda}
                    </div>
                    <div className="text-[10px] text-slate-400">miembros</div>
                  </div>

                  <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30">
                    <div className="text-xs text-red-300 font-semibold">F2: Ifrit</div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {activeSnapshot.phaseDistribution.ifrit}
                    </div>
                    <div className="text-[10px] text-slate-400">miembros</div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                    <div className="text-xs text-amber-300 font-semibold">F3: Titan</div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {activeSnapshot.phaseDistribution.titan}
                    </div>
                    <div className="text-[10px] text-slate-400">miembros</div>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30">
                    <div className="text-xs text-purple-300 font-semibold">F4: Ultima</div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {activeSnapshot.phaseDistribution.ultima}
                    </div>
                    <div className="text-[10px] text-slate-400">miembros</div>
                  </div>

                  <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
                    <div className="text-xs text-cyan-300 font-semibold">F5: Enrage</div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {activeSnapshot.phaseDistribution.enrage}
                    </div>
                    <div className="text-[10px] text-slate-400">miembros</div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-900/40 border border-emerald-400">
                    <div className="text-xs text-emerald-200 font-bold">CLEAR</div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {activeSnapshot.phaseDistribution.cleared}
                    </div>
                    <div className="text-[10px] text-slate-300">victorias</div>
                  </div>
                </div>
              </div>

              {/* Tabla Detallada de Miembros en este Snapshot */}
              <div className="glass-card rounded-2xl p-6 border border-white/10">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                  Progreso Individual en Semana {activeSnapshot.weekNumber}
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-semibold">
                        <th className="py-2.5 px-3">Miembro</th>
                        <th className="py-2.5 px-3">Garuda</th>
                        <th className="py-2.5 px-3">Ifrit</th>
                        <th className="py-2.5 px-3">Titan</th>
                        <th className="py-2.5 px-3">Ultima</th>
                        <th className="py-2.5 px-3">Roulettes</th>
                        <th className="py-2.5 px-3 text-right">Score Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activeSnapshot.memberSnapshots.map(m => (
                        <tr
                          key={m.id}
                          className={`hover:bg-white/5 transition-all ${
                            m.memberId === session.memberId ? 'bg-cyan-950/25 font-semibold' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-white flex items-center gap-2">
                            <span>{m.characterName}</span>
                            {m.memberId === session.memberId && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                                Tú
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-400 font-mono">{m.p1Pct}%</td>
                          <td className="py-2.5 px-3 text-red-400 font-mono">{m.p2Pct}%</td>
                          <td className="py-2.5 px-3 text-amber-400 font-mono">{m.p3Pct}%</td>
                          <td className="py-2.5 px-3 text-purple-400 font-mono">{m.p4Pct}%</td>
                          <td className="py-2.5 px-3 text-cyan-400 font-mono">{m.p5Pct}%</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-300">
                            {m.overallScore} / 500
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Estado Vacío cuando no hay semanas aceptadas */
        <div className="glass-card rounded-3xl p-10 text-center border border-white/10 space-y-4 max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-300">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No hay semanas archivadas todavía</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            El registro semanal va de la mano con el calendario civil (lunes a domingo) y 
            <strong className="text-slate-200"> solo guarda las semanas que el Administrador acepte y confirme</strong>.
          </p>
          {session.type === 'ADMIN' ? (
            <div className="pt-2">
              <button
                onClick={() => setIsAcceptModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Aceptar y Guardar Semana {currentCalendarWeek.weekNumber}</span>
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">
              El administrador de la FC archivará el progreso cuando cierre la semana actual.
            </p>
          )}
        </div>
      )}

      {/* Modal de Aceptación de Semana por el Admin */}
      {isAcceptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl glass-modal p-6 border border-cyan-500/30 shadow-[0_0_50px_rgba(56,189,248,0.2)] space-y-5">
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isCurrentWeekAccepted ? 'Actualizar Registro Semanal' : 'Aceptar Registro Semanal'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Semana {currentCalendarWeek.weekNumber} del Calendario
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detalles de la Semana del Calendario */}
            <div className="space-y-3 text-xs bg-slate-950/60 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Período de Calendario:</span>
                <span className="font-semibold text-white">{currentCalendarWeek.formattedRange}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Lunes de Apertura:</span>
                <span className="font-mono text-cyan-300">{currentCalendarWeek.weekStartDate}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Domingo de Cierre:</span>
                <span className="font-mono text-cyan-300">{currentCalendarWeek.weekEndDate}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Miembros Activos a Guardar:</span>
                <span className="font-bold text-white">{liveStats.memberCount} integrantes</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Puntaje Promedio FC:</span>
                <span className="font-mono font-bold text-emerald-300">{liveStats.averageScore} / 500 pts</span>
              </div>
            </div>

            {/* Nota de Aceptación */}
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-2.5 text-[11px] text-indigo-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <div>
                Solo las semanas que tú aceptes como administrador se registrarán en el histórico. Las semanas no aceptadas no serán archivadas.
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAcceptWeek}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Guardando...' : 'Confirmar y Guardar Registro'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
