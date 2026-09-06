'use client';

import { useState } from 'react';
import { JobId } from '@/types';
import { FFXIV_JOBS } from '@/lib/ffxiv-jobs';

interface FlexJobsBadgeListProps {
  jobs: JobId[];
  maxPreview?: number;
  className?: string;
}

export default function FlexJobsBadgeList({
  jobs,
  maxPreview = 3,
  className = '',
}: FlexJobsBadgeListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!jobs || jobs.length === 0) return null;

  // Si tiene hasta maxPreview + 1 (ej. 4), no tiene sentido poner "+1", se muestran los 4 directamente.
  const shouldTruncate = jobs.length > maxPreview + 1;
  const visibleJobs = !shouldTruncate || isExpanded ? jobs : jobs.slice(0, maxPreview);
  const hiddenCount = jobs.length - maxPreview;
  const hiddenJobs = jobs.slice(maxPreview);

  return (
    <div className={`flex items-center gap-1 flex-wrap text-[11px] text-slate-400 min-w-0 ${className}`}>
      <span className="shrink-0 text-slate-400 font-medium">Flex:</span>
      {visibleJobs.map(fj => {
        const job = FFXIV_JOBS[fj];
        return (
          <span
            key={fj}
            className="font-bold text-slate-300 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-[10px] font-mono shadow-sm shrink-0"
            title={job?.name ? `${fj} - ${job.name}` : fj}
          >
            {fj}
          </span>
        );
      })}

      {shouldTruncate && !isExpanded && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
          className="font-bold text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-[10px] font-mono hover:bg-cyan-900/70 hover:border-cyan-400 transition-all cursor-pointer shadow-sm shrink-0 hover:scale-105 active:scale-95"
          title={`+${hiddenCount} más: ${hiddenJobs.join(', ')} (clic para ver todos)`}
          aria-label={`Ver ${hiddenCount} trabajos flex adicionales`}
        >
          +{hiddenCount}
        </button>
      )}

      {shouldTruncate && isExpanded && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(false);
          }}
          className="text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/50 text-[10px] font-medium transition-all cursor-pointer hover:bg-slate-700/80 active:scale-95 shrink-0"
          title="Mostrar menos trabajos flex"
          aria-label="Mostrar menos trabajos flex"
        >
          menos
        </button>
      )}
    </div>
  );
}
