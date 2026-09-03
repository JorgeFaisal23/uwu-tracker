import { JobId } from '@/types';
import { FFXIV_JOBS } from '@/lib/ffxiv-jobs';
import { 
  Shield, 
  Axe, 
  Sword, 
  Zap, 
  HeartHandshake, 
  Sparkles, 
  BookOpen, 
  Activity, 
  Flame, 
  Compass, 
  Wind, 
  Crosshair, 
  Moon, 
  Skull,
  Music, 
  Target, 
  Sun, 
  Eye, 
  Feather, 
  Sparkle, 
  Palette 
} from 'lucide-react';

interface JobBadgeProps {
  jobId: JobId;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  isMain?: boolean;
}

export default function JobBadge({ jobId, size = 'md', isMain }: JobBadgeProps) {
  const job = FFXIV_JOBS[jobId];
  if (!job) return <span>{jobId}</span>;

  // Icono representativo
  const renderIcon = () => {
    const iconProps = { className: size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4' };
    switch (jobId) {
      case 'PLD': return <Shield {...iconProps} />;
      case 'WAR': return <Axe {...iconProps} />;
      case 'DRK': return <Sword {...iconProps} />;
      case 'GNB': return <Zap {...iconProps} />;
      case 'WHM': return <HeartHandshake {...iconProps} />;
      case 'AST': return <Sparkles {...iconProps} />;
      case 'SCH': return <BookOpen {...iconProps} />;
      case 'SGE': return <Activity {...iconProps} />;
      case 'MNK': return <Flame {...iconProps} />;
      case 'DRG': return <Compass {...iconProps} />;
      case 'NIN': return <Wind {...iconProps} />;
      case 'SAM': return <Moon {...iconProps} />;
      case 'RPR': return <Skull {...iconProps} />;
      case 'VPR': return <Zap {...iconProps} />;
      case 'BRD': return <Music {...iconProps} />;
      case 'MCH': return <Crosshair {...iconProps} />;
      case 'DNC': return <Sun {...iconProps} />;
      case 'BLM': return <Eye {...iconProps} />;
      case 'SMN': return <Feather {...iconProps} />;
      case 'RDM': return <Sparkle {...iconProps} />;
      case 'PCT': return <Palette {...iconProps} />;
      default: return <Sparkles {...iconProps} />;
    }
  };

  const roleStyles = {
    TANK: 'bg-blue-950/70 border-blue-500/40 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.2)]',
    HEALER: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    DPS: 'bg-rose-950/70 border-rose-500/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]',
  }[job.roleCategory];

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs sm:text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-sm sm:text-base gap-2 font-medium',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-lg border backdrop-blur-md transition-all duration-300 hover:scale-105 ${roleStyles} ${sizeClasses}`}
      style={{ borderColor: `${job.color}60` }}
      title={`${job.id} - ${job.name}`}
    >
      <span style={{ color: job.color }}>{renderIcon()}</span>
      <span className="font-semibold tracking-wider font-mono">{job.id}</span>
      {isMain && (
        <span
          className="ml-0.5 text-[10px] uppercase font-bold px-1 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40"
          title="Main Job"
        >
          Main
        </span>
      )}
    </span>
  );
}
