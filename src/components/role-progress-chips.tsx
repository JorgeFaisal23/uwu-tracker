import { Member, MemberProgress, SubRole } from '@/types';
import { FFXIV_JOBS } from '@/lib/ffxiv-jobs';
import {
  SUBROLE_LABELS,
  SUBROLE_SHORT_LABELS,
  editableSubroles,
  resolveRoleProgress,
} from '@/lib/progress';

interface RoleProgressChipsProps {
  member: Pick<Member, 'mainJob' | 'flexJobs'>;
  progress: MemberProgress;
  /** Rol resaltado; en el editor es el que se está tocando. */
  activeSubrole?: SubRole | null;
  onSelect?: (subrole: SubRole) => void;
}

/**
 * El progreso de cada rol que el miembro puede cubrir.
 *
 * Distingue a la vista los roles con progreso propio de los que heredan el general:
 * es lo que explica por qué el buscador coloca a alguien en un puesto y no en otro.
 */
export default function RoleProgressChips({
  member,
  progress,
  activeSubrole,
  onSelect,
}: RoleProgressChipsProps) {
  const mainSubrole = FFXIV_JOBS[member.mainJob]?.subrole;
  const subroles = editableSubroles(member, progress);

  if (subroles.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {subroles.map(subrole => {
        const own = progress.byRole[subrole];
        const score = resolveRoleProgress(progress, subrole).overallScore;
        const isActive = activeSubrole === subrole;
        const isMain = subrole === mainSubrole;

        const label = `${SUBROLE_LABELS[subrole]}: ${score} / 500${
          own ? '' : ' (heredado del progreso general)'
        }`;

        const Tag = onSelect ? 'button' : 'span';

        return (
          <Tag
            key={subrole}
            {...(onSelect ? { type: 'button' as const, onClick: () => onSelect(subrole) } : {})}
            title={label}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition-all ${
              isActive
                ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/60'
                : own
                ? 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30'
                : 'bg-slate-900/70 text-slate-400 border-white/10'
            } ${onSelect ? 'hover:border-cyan-400/60 hover:text-white' : ''}`}
          >
            <span>{SUBROLE_SHORT_LABELS[subrole]}</span>
            {isMain && <span className="text-[9px] text-cyan-400">main</span>}
            <span className="font-mono">{score}</span>
          </Tag>
        );
      })}
    </div>
  );
}
