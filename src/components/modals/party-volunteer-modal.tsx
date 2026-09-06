'use client';

import { useState, useEffect } from 'react';
import { JobId, Member, PartyVolunteer, ScheduledParty, SlotRole } from '@/types';
import { FFXIV_JOBS } from '@/lib/ffxiv-jobs';
import JobBadge from '../job-badge';
import { 
  HandHeart, 
  X, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  Trash2, 
  Check, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { formatDateToSpanish } from '@/lib/date-utils';

export type VolunteerModalTarget =
  | {
      type: 'SCHEDULED_PARTY';
      party: ScheduledParty;
    }
  | {
      type: 'INCOMPLETE_SLOT';
      slotKey: string;
      dayOfWeek: number;
      dayName: string;
      hourLabel: string;
      missingSlots: SlotRole[];
      notes?: string;
    };

interface PartyVolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: VolunteerModalTarget | null;
  currentMember?: Member;
  existingVolunteer?: PartyVolunteer | null;
  onSubmit: (data: {
    partyScheduleId?: string;
    slotKey?: string;
    assignedJob: JobId;
    assignedRole: string;
    availabilityNote?: string;
  }) => Promise<void>;
  onRemove?: (data: { partyScheduleId?: string; slotKey?: string }) => Promise<void>;
}

const ROLE_OPTIONS: { id: string; label: string; group: string }[] = [
  { id: 'MT', label: 'MT — Main Tank', group: 'Tanks' },
  { id: 'OT', label: 'OT — Off Tank', group: 'Tanks' },
  { id: 'PH', label: 'PH — Pure Healer (WHM / AST)', group: 'Healers' },
  { id: 'SH', label: 'SH — Shield Healer (SCH / SGE)', group: 'Healers' },
  { id: 'M1', label: 'M1 — Melee DPS (Posición 1)', group: 'DPS' },
  { id: 'M2', label: 'M2 — Melee DPS (Posición 2)', group: 'DPS' },
  { id: 'PR', label: 'PR — Physical Ranged (BRD/MCH/DNC)', group: 'DPS' },
  { id: 'C', label: 'C — Caster (BLM/SMN/RDM/PCT)', group: 'DPS' },
  { id: 'CUALQUIER_TANK', label: 'Cualquier Tank (MT u OT)', group: 'Comodín' },
  { id: 'CUALQUIER_HEALER', label: 'Cualquier Healer (Pure o Shield)', group: 'Comodín' },
  { id: 'CUALQUIER_DPS', label: 'Cualquier DPS', group: 'Comodín' },
  { id: 'CUALQUIER_ROL', label: 'Cualquier Rol (Flex Total)', group: 'Comodín' },
];

const ALL_JOBS = Object.keys(FFXIV_JOBS) as JobId[];

export default function PartyVolunteerModal({
  isOpen,
  onClose,
  target,
  currentMember,
  existingVolunteer,
  onSubmit,
  onRemove,
}: PartyVolunteerModalProps) {
  const [selectedRole, setSelectedRole] = useState<string>('MT');
  const [selectedJob, setSelectedJob] = useState<JobId>('WAR');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  // Inicializar campos según voluntario previo o perfil del miembro
  useEffect(() => {
    if (existingVolunteer) {
      setSelectedRole(existingVolunteer.assignedRole);
      setSelectedJob(existingVolunteer.assignedJob);
      setNote(existingVolunteer.availabilityNote || '');
    } else if (currentMember) {
      setSelectedJob(currentMember.mainJob || 'WAR');
      // Inferir rol sugerido del mainJob
      const jobInfo = FFXIV_JOBS[currentMember.mainJob];
      if (jobInfo?.subrole === 'TANK') setSelectedRole('MT');
      else if (jobInfo?.subrole === 'PURE_HEALER') setSelectedRole('PH');
      else if (jobInfo?.subrole === 'SHIELD_HEALER') setSelectedRole('SH');
      else if (jobInfo?.subrole === 'MELEE') setSelectedRole('M1');
      else if (jobInfo?.subrole === 'PHYS_RANGED') setSelectedRole('PR');
      else if (jobInfo?.subrole === 'CASTER') setSelectedRole('C');
      setNote('');
    }
  }, [existingVolunteer, currentMember, target, isOpen]);

  if (!isOpen || !target) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (target.type === 'SCHEDULED_PARTY') {
        await onSubmit({
          partyScheduleId: target.party.id,
          assignedJob: selectedJob,
          assignedRole: selectedRole,
          availabilityNote: note.trim() || undefined,
        });
      } else {
        await onSubmit({
          slotKey: target.slotKey,
          assignedJob: selectedJob,
          assignedRole: selectedRole,
          availabilityNote: note.trim() || undefined,
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setIsRemoving(true);
    try {
      if (target.type === 'SCHEDULED_PARTY') {
        await onRemove({ partyScheduleId: target.party.id });
      } else {
        await onRemove({ slotKey: target.slotKey });
      }
      onClose();
    } finally {
      setIsRemoving(false);
    }
  };

  const isPartyTarget = target.type === 'SCHEDULED_PARTY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-7 border border-cyan-500/30 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-5">
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-400/40 text-cyan-300">
            <HandHeart className="w-6 h-6" />
          </div>
          <div className="pr-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                {isPartyTarget ? 'Suplente de Emergencia' : 'Convocatoria de Incursión'}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
              {isPartyTarget
                ? '¡Puedo ayudar como Suplente!'
                : '¡Puedo ayudar a completar esta Party!'}
            </h3>
            <p className="text-xs text-slate-300/90 mt-0.5">
              {isPartyTarget
                ? 'Deja saber al grupo y al administrador que estás disponible si alguien declina o no puede asistir.'
                : 'Ayuda a reunir a los 8 integrantes para que el admin pueda oficializar la incursión.'}
            </p>
          </div>
        </div>

        {/* Resumen del Horario y Party */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 text-xs">
          {isPartyTarget ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  {formatDateToSpanish(target.party.scheduledDate, true)}
                </span>
                <span className="text-slate-300 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {target.party.hourSlot.toString().padStart(2, '0')}:00 ({target.party.durationHours}h)
                </span>
              </div>
              {target.party.notes && (
                <div className="text-[11px] text-slate-400 italic pt-1 border-t border-white/5">
                  &ldquo;{target.party.notes}&rdquo;
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  {target.dayName} a las {target.hourLabel}
                </span>
                <span className="text-amber-300 text-[11px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Franja Incompleta
                </span>
              </div>
              {target.missingSlots.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
                  <span className="text-slate-400 text-[11px] font-medium">Puestos que hacen falta:</span>
                  {target.missingSlots.map(s => (
                    <span
                      key={s}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950/60 text-rose-300 border border-rose-500/40 animate-pulse"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {target.notes && (
                <div className="text-[11px] text-cyan-300/90 pt-1 border-t border-white/5">
                  Nota del Admin: &ldquo;{target.notes}&rdquo;
                </div>
              )}
            </>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Selector de Rol */}
          <div>
            <label className="block text-slate-200 font-semibold mb-1">
              ¿Qué Puesto o Rol puedes cubrir? <span className="text-cyan-400">*</span>
            </label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-sans cursor-pointer"
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Job */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-200 font-semibold">
                Job que llevarías <span className="text-cyan-400">*</span>
              </label>
              {currentMember && (
                <span className="text-[11px] text-slate-400">
                  Main: <strong className="text-cyan-300">{currentMember.mainJob}</strong>
                  {currentMember.flexJobs?.length > 0 && (
                    <> · Flex: {currentMember.flexJobs.join(', ')}</>
                  )}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedJob}
                onChange={e => setSelectedJob(e.target.value as JobId)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-sans cursor-pointer"
              >
                {ALL_JOBS.map(jobId => {
                  const job = FFXIV_JOBS[jobId];
                  const isMain = currentMember?.mainJob === jobId;
                  const isFlex = currentMember?.flexJobs?.includes(jobId);
                  return (
                    <option key={jobId} value={jobId}>
                      {jobId} - {job.name} {isMain ? '⭐ (Main)' : isFlex ? '⚡ (Flex)' : ''}
                    </option>
                  );
                })}
              </select>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-[11px] text-slate-400">Previsualización:</span>
                <JobBadge
                  jobId={selectedJob}
                  size="sm"
                  isMain={currentMember?.mainJob === selectedJob}
                />
              </div>
            </div>
          </div>

          {/* Notas de Disponibilidad */}
          <div>
            <label className="block text-slate-200 font-semibold mb-1">
              Disponibilidad o Notas (Opcional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Disponible las 2 horas completas / Puedo entrar si alguien falta a última hora / Disponible a partir de las 21:30..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
            {existingVolunteer && onRemove ? (
              <button
                type="button"
                disabled={isRemoving || isSubmitting}
                onClick={handleRemove}
                className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isRemoving ? 'Retirando...' : 'Retirar mi ayuda'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-all"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isRemoving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Guardando...'
                    : existingVolunteer
                    ? 'Actualizar ofrecimiento'
                    : 'Confirmar mi ofrecimiento'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
