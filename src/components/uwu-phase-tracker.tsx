import { UwuProgress } from '@/types';
import { getActiveBreakpoint, UWU_PHASES } from '@/lib/ffxiv-jobs';
import { Sparkles } from 'lucide-react';

interface UwuPhaseTrackerProps {
  progress: UwuProgress;
  compact?: boolean;
  onEditClick?: () => void;
  canEdit?: boolean;
  /** Rol al que corresponde este progreso; solo se pinta si hay progreso por rol. */
  roleLabel?: string;
}

export default function UwuPhaseTracker({
  progress,
  compact = false,
  onEditClick,
  canEdit = false,
  roleLabel,
}: UwuPhaseTrackerProps) {
  const pcts = [
    progress.p1GarudaPct,
    progress.p2IfritPct,
    progress.p3TitanPct,
    progress.p4UltimaPct,
    progress.p5RoulettePct,
  ];

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            {progress.currentPhaseName}
          </span>
          <span className="text-cyan-300 font-mono font-bold">
            {progress.overallScore} / 500
          </span>
        </div>

        {/* 5 Shards compactos */}
        <div className="grid grid-cols-5 gap-1 h-2 w-full bg-slate-900/80 rounded-full p-0.5 border border-white/5 overflow-hidden">
          {UWU_PHASES.map((phase, idx) => {
            const pct = pcts[idx] || 0;
            const activeBp = getActiveBreakpoint(phase, pct);
            const tooltipTitle = activeBp
              ? `${phase.name}: ${pct}% (${activeBp.name})`
              : `${phase.name}: ${pct}%`;

            return (
              <div
                key={phase.id}
                className="relative h-full bg-slate-800/80 rounded-full overflow-hidden"
                title={tooltipTitle}
              >
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: phase.color,
                    boxShadow: pct > 0 ? `0 0 8px ${phase.color}` : 'none',
                  }}
                />
                {phase.breakpoints?.map(bp => (
                  <div
                    key={bp.name}
                    className="absolute top-0 bottom-0 w-0.5 bg-white/40 pointer-events-none z-10"
                    style={{ left: `${bp.pct}%` }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden border border-indigo-500/20">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            The Weapon&apos;s Refrain (Ultimate)
          </div>
          <h4 className="text-lg font-bold text-white tracking-wide mt-0.5">
            {progress.currentPhaseName}
          </h4>
          {roleLabel && (
            <div className="text-[11px] text-indigo-300 mt-0.5">
              Progreso como <strong className="text-indigo-200">{roleLabel}</strong>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400">Progreso Total</div>
            <div className="text-xl font-bold font-mono text-cyan-300">
              {progress.overallScore}{' '}
              <span className="text-xs text-slate-400 font-normal">/ 500 pts</span>
            </div>
          </div>

          {canEdit && onEditClick && (
            <button
              onClick={onEditClick}
              className="px-3.5 py-1.5 text-xs font-medium rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-400/40 text-cyan-200 transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              Actualizar Progreso
            </button>
          )}
        </div>
      </div>

      {/* 5 Cristales de Fase detallados */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {UWU_PHASES.map((phase, idx) => {
          const pct = pcts[idx] || 0;
          const isComplete = pct >= 100;
          const isActive = pct > 0 && pct < 100;
          const activeBp = getActiveBreakpoint(phase, pct);

          return (
            <div
              key={phase.id}
              className={`rounded-xl p-3 border transition-all duration-300 ${
                isComplete
                  ? 'bg-emerald-950/25 border-emerald-500/30'
                  : isActive
                  ? 'bg-cyan-950/30 border-cyan-400/40 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                  : 'bg-slate-900/40 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300 truncate mr-1" title={phase.shortName}>
                  {phase.shortName}
                </span>
                <span
                  className="font-mono font-bold shrink-0"
                  style={{ color: isComplete ? '#34d399' : phase.color }}
                >
                  {pct}%
                </span>
              </div>

              {/* Barra de Cristal */}
              <div className="relative w-full bg-slate-950/80 rounded-full h-2 overflow-hidden border border-white/5">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: phase.color,
                    boxShadow: pct > 0 ? `0 0 10px ${phase.color}` : 'none',
                  }}
                />
                {phase.breakpoints?.map(bp => (
                  <div
                    key={bp.name}
                    className="absolute top-0 bottom-0 w-0.5 bg-white/40 pointer-events-none z-10"
                    style={{ left: `${bp.pct}%` }}
                    title={`${bp.name}: ${bp.pct}%`}
                  />
                ))}
              </div>

              <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between gap-1">
                <span className="shrink-0">Fase {phase.id}</span>
                {isComplete ? (
                  <span className="text-emerald-400 font-bold text-[10px]">DOMINADA</span>
                ) : isActive ? (
                  <span
                    className="text-cyan-300 font-medium text-[10px] animate-pulse truncate text-right"
                    title={activeBp ? activeBp.name : 'EN PROGRESO'}
                  >
                    {activeBp ? activeBp.name : 'EN PROGRESO'}
                  </span>
                ) : (
                  <span className="text-slate-500 text-[10px]">Pendiente</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
