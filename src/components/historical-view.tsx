'use client';

import { useState } from 'react';
import { WeeklyFcSnapshot, UserSession } from '@/types';
import { TrendingUp, Award, Calendar, Sparkles, Camera, Users } from 'lucide-react';

interface HistoricalViewProps {
  snapshots: WeeklyFcSnapshot[];
  session: UserSession;
  onTakeSnapshot: () => Promise<void>;
}

export default function HistoricalView({
  snapshots,
  session,
  onTakeSnapshot,
}: HistoricalViewProps) {
  const [selectedWeek, setSelectedWeek] = useState<number>(
    snapshots.length > 0 ? snapshots[0].weekNumber : 1
  );
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);

  const activeSnapshot = snapshots.find(s => s.weekNumber === selectedWeek) || snapshots[0];

  const handleCreateSnapshot = async () => {
    if (!confirm('¿Deseas cerrar la semana actual y archivar un snapshot histórico del progreso de todos los miembros?')) {
      return;
    }
    setIsTakingSnapshot(true);
    try {
      await onTakeSnapshot();
    } finally {
      setIsTakingSnapshot(false);
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
            Monitorea cómo avanza la Free Company semana a semana hacia el Clear de Ultima Weapon.
          </p>
        </div>

        {session.type === 'ADMIN' && (
          <button
            onClick={handleCreateSnapshot}
            disabled={isTakingSnapshot}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>{isTakingSnapshot ? 'Archivando...' : 'Cerrar Semana y Guardar Foto Histórica'}</span>
          </button>
        )}
      </div>

      {/* Selector de Semanas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {snapshots.map(s => (
          <button
            key={s.weekNumber}
            onClick={() => setSelectedWeek(s.weekNumber)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              selectedWeek === s.weekNumber
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)] border border-cyan-300/40'
                : 'bg-slate-900/60 text-slate-400 border border-white/5 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Semana {s.weekNumber}</span>
          </button>
        ))}
      </div>

      {activeSnapshot && (
        <div className="space-y-6">
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
                Fecha del snapshot: {new Date(activeSnapshot.recordedAt).toLocaleDateString()}
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
  );
}
