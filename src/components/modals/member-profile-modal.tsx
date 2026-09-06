'use client';

import { useEffect, useState } from 'react';
import { JobId, Member, MemberProgress, ProgressMode, SubRole, TankStance } from '@/types';
import { adjustPhaseProgressOnEdit, FFXIV_JOBS, normalizePhaseProgress, SUBROLE_LABELS, UWU_PHASES } from '@/lib/ffxiv-jobs';
import { editableSubroles, resolveRoleProgress } from '@/lib/progress';
import { APP_VERSION } from '@/lib/changelog';
import RoleProgressChips from '@/components/role-progress-chips';
import { X, Sparkles, Sliders, Check, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  progress: MemberProgress;
  onUpdateSuccess: () => Promise<void>;
  /** Abre las novedades de la versión desde el sello discreto de la cabecera. */
  onOpenChangelog?: () => void;
}

export default function MemberProfileModal(props: MemberProfileModalProps) {
  if (!props.isOpen) return null;

  // El contenido se monta de cero cada vez que se abre el panel, para partir siempre
  // de lo que hay guardado. Mientras está abierto no se remonta: perder el rol que se
  // está editando en mitad de un guardado sería peor que conservar el borrador.
  return <MemberProfileModalContent {...props} key={props.member.id} />;
}

/** Clave del borrador de un destino de progreso: el general o un subrol concreto. */
type ProgressTarget = SubRole | 'GENERAL';

type Pcts = [number, number, number, number, number];

function MemberProfileModalContent({
  onClose,
  member,
  progress,
  onUpdateSuccess,
  onOpenChangelog,
}: MemberProfileModalProps) {
  // Progreso en las 5 fases. `target` es lo que se está editando: el progreso general
  // o el de un rol concreto. Los borradores se guardan por destino para poder saltar
  // entre roles sin perder lo tecleado.
  const [target, setTarget] = useState<ProgressTarget>('GENERAL');
  const [drafts, setDrafts] = useState<Partial<Record<ProgressTarget, Pcts>>>({});

  const perRole = progress.mode === 'PER_ROLE';
  const targetSubrole: SubRole | null = target === 'GENERAL' ? null : target;
  const roles = editableSubroles(member, progress);

  /** Lo guardado para un destino: el rol propio si lo tiene, o el general heredado. */
  function savedPcts(t: ProgressTarget): Pcts {
    const p = resolveRoleProgress(progress, t === 'GENERAL' ? null : t);
    return normalizePhaseProgress([p.p1GarudaPct, p.p2IfritPct, p.p3TitanPct, p.p4UltimaPct, p.p5RoulettePct]);
  }

  const [p1, p2, p3, p4, p5] = drafts[target] ?? savedPcts(target);
  const inheritsGeneral = perRole && targetSubrole !== null && !progress.byRole[targetSubrole];

  // Perfil de jobs
  const [mainJob, setMainJob] = useState<JobId>(member.mainJob);
  const [flexJobs, setFlexJobs] = useState<JobId[]>(member.flexJobs || []);
  const [tankStance, setTankStance] = useState<TankStance>(member.tankStance || 'BOTH');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [activeTab, setActiveTab] = useState<'progress' | 'jobs' | 'security'>('progress');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Al modificar una fase, las anteriores se llenan al 100% y las posteriores se vacían al 0%
  const handlePhaseChange = (phaseId: number, value: number) => {
    const next = adjustPhaseProgressOnEdit([p1, p2, p3, p4, p5], phaseId, value);
    setDrafts(prev => ({ ...prev, [target]: next }));
  };

  const isTankSelected = 
    FFXIV_JOBS[mainJob]?.subrole === 'TANK' ||
    flexJobs.some(j => FFXIV_JOBS[j]?.subrole === 'TANK');

  const toggleFlexJob = (jobId: JobId) => {
    if (jobId === mainJob) return;
    setFlexJobs(prev =>
      prev.includes(jobId) ? prev.filter(j => j !== jobId) : [...prev, jobId]
    );
  };

  const handleSaveProgress = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Sin rol se escribe el progreso general, que es el que heredan los demás.
          subrole: targetSubrole,
          p1GarudaPct: p1,
          p2IfritPct: p2,
          p3TitanPct: p3,
          p4UltimaPct: p4,
          p5RoulettePct: p5,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al actualizar progreso');
      }

      // Celebración si completó o avanzó significativamente
      const antes = resolveRoleProgress(progress, targetSubrole);
      if (p5 >= 100 || (p4 >= 100 && antes.p4UltimaPct < 100)) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#a855f7', '#34d399', '#f59e0b'],
        });
      }

      setSuccessMsg(
        targetSubrole
          ? `¡Progreso de ${SUBROLE_LABELS[targetSubrole]} actualizado!`
          : '¡Progreso actualizado con éxito!'
      );
      await onUpdateSuccess();
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  /** Cambia entre un progreso único para todos los roles y uno por rol. */
  const handleChangeMode = async (mode: ProgressMode) => {
    if (mode === progress.mode) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al cambiar el modo de progreso');
      }

      // Al volver al progreso único no hay rol que editar; los ajustes por rol se
      // conservan en la base por si se vuelve a activar.
      if (mode === 'UNIFIED') setTarget('GENERAL');
      await onUpdateSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  /** Descarta el progreso propio del rol: vuelve a heredar el general. */
  const handleResetRole = async () => {
    if (!targetSubrole) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/progress?subrole=${targetSubrole}`, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al restablecer el rol');
      }

      // Sin borrador, los deslizadores vuelven a mostrar el progreso general heredado.
      setDrafts(prev => {
        const next = { ...prev };
        delete next[targetSubrole];
        return next;
      });
      setSuccessMsg(`${SUBROLE_LABELS[targetSubrole]} vuelve a usar tu progreso general.`);
      await onUpdateSuccess();
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainJob,
          flexJobs,
          tankStance: isTankSelected ? tankStance : null,
          // Cambiar la contraseña exige demostrar que se conoce la actual.
          currentPassword: newPassword ? currentPassword : undefined,
          newPassword: newPassword || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al actualizar perfil');
      }

      setSuccessMsg('¡Perfil actualizado con éxito!');
      await onUpdateSuccess();
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-3xl glass-modal border border-indigo-500/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden my-auto">
        {/* Cabecera fija con botón de salir (X) siempre visible */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-white/5 flex-shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-indigo-400/30 text-indigo-300">
              <Sliders className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Panel de Miembro: {member.characterName}
              </h3>
              <p className="text-xs text-cyan-400">Actualiza tu progreso en UWU y roles</p>
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2 shrink-0">
            {/* Sello de versión: discreto a propósito, solo para quien lo busque. */}
            {onOpenChangelog && (
              <button
                type="button"
                onClick={onOpenChangelog}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-mono text-slate-500 hover:text-cyan-300 hover:bg-white/5 transition-all"
                title={`Ver las novedades de la version ${APP_VERSION}`}
              >
                v{APP_VERSION}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pestañas fijas */}
        <div className="px-5 sm:px-6 pt-3 pb-2 flex-shrink-0 bg-slate-950/20 border-b border-white/5">
          <div className="flex rounded-xl bg-slate-900/80 p-1 border border-white/5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('progress')}
              className={`flex-1 py-2 font-bold rounded-lg transition-all ${
                activeTab === 'progress'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Progreso 5 Fases
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('jobs')}
              className={`flex-1 py-2 font-bold rounded-lg transition-all ${
                activeTab === 'jobs'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Jobs & Stance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-2 font-bold rounded-lg transition-all ${
                activeTab === 'security'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Seguridad
            </button>
          </div>
        </div>

        {/* Cuerpo con scroll interno */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto min-h-0 space-y-4">
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Pestaña: Progreso de las 5 Fases */}
          {activeTab === 'progress' && (
            <div className="space-y-4">
              {/* Modo: un progreso para todo, o uno por rol */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {(
                    [
                      ['UNIFIED', 'Mismo progreso para todos'],
                      ['PER_ROLE', 'Progreso por rol'],
                    ] as [ProgressMode, string][]
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      disabled={loading}
                      onClick={() => handleChangeMode(mode)}
                      className={`py-2 px-2 rounded-xl border font-bold transition-all disabled:opacity-50 ${
                        progress.mode === mode
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {perRole
                    ? 'Cada rol lleva su propio progreso. Al armar parties se usa el del rol que te tocaría, así que un flex que apenas has jugado ya no cuenta como tu main.'
                    : 'Tu progreso vale igual para tu main job y para todos tus flex jobs.'}
                </p>
              </div>

              {/* Selector de rol, solo con progreso por rol */}
              {perRole && (
                <div className="space-y-2 p-3 rounded-2xl bg-slate-950/50 border border-white/5">
                  <div className="text-[11px] text-slate-300 font-semibold">¿Qué estás editando?</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTarget('GENERAL')}
                      title={`Progreso general: ${progress.general.overallScore} / 500`}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition-all ${
                        target === 'GENERAL'
                          ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/60'
                          : 'bg-slate-900/70 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      <span>General</span>
                      <span className="font-mono">{progress.general.overallScore}</span>
                    </button>

                    <RoleProgressChips
                      member={member}
                      progress={progress}
                      activeSubrole={targetSubrole}
                      onSelect={setTarget}
                    />
                  </div>

                  {roles.length <= 1 && (
                    <p className="text-[11px] text-amber-300/80">
                      Solo cubres un rol. Añade flex jobs en la pestaña &laquo;Jobs &amp; Stance&raquo;
                      para que el progreso por rol tenga efecto.
                    </p>
                  )}
                </div>
              )}

              <div className="text-xs text-slate-400">
                {targetSubrole
                  ? `Progreso como ${SUBROLE_LABELS[targetSubrole]} en las 5 partes de UWU:`
                  : 'Desliza el porcentaje alcanzado en cada una de las 5 partes de UWU (0 a 100% cada una):'}
              </div>

              {inheritsGeneral && (
                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200">
                  Este rol usa tu progreso general. En cuanto guardes, pasará a llevar el suyo propio.
                </div>
              )}

              <div className="space-y-3.5">
                {UWU_PHASES.map(phase => {
                  const val = 
                    phase.id === 1 ? p1 :
                    phase.id === 2 ? p2 :
                    phase.id === 3 ? p3 :
                    phase.id === 4 ? p4 : p5;

                  return (
                    <div key={phase.id} className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-white">{phase.name}</span>
                        <span className="font-mono font-bold text-cyan-300">{val}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={val}
                        onChange={e => handlePhaseChange(phase.id, Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100% (Clean)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {perRole && targetSubrole && !inheritsGeneral && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResetRole}
                  className="w-full py-2 rounded-xl bg-slate-900/70 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all disabled:opacity-50 text-[11px] flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Volver a usar mi progreso general en este rol</span>
                </button>
              )}
            </div>
          )}

          {/* Pestaña: Jobs & Stance */}
          {activeTab === 'jobs' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Main Job</label>
                <select
                  value={mainJob}
                  onChange={e => {
                    const newJob = e.target.value as JobId;
                    setMainJob(newJob);
                    setFlexJobs(prev => prev.filter(j => j !== newJob));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                >
                  {Object.values(FFXIV_JOBS).map(j => (
                    <option key={j.id} value={j.id}>
                      {j.id} - {j.name} ({SUBROLE_LABELS[j.subrole]})
                    </option>
                  ))}
                </select>
              </div>

              {isTankSelected && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Preferencia de Tank (Stance)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['MT', 'OT', 'BOTH'] as TankStance[]).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setTankStance(st)}
                        className={`py-1.5 rounded-lg border text-center font-bold transition-all ${
                          tankStance === st
                            ? 'bg-blue-600/30 text-blue-300 border-blue-400 shadow-sm'
                            : 'bg-slate-900/60 text-slate-400 border-white/5'
                        }`}
                      >
                        {st === 'MT' ? 'Main Tank' : st === 'OT' ? 'Off Tank' : 'Ambos'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Flex Jobs (Selecciona jobs secundarios)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-48 overflow-y-auto p-1.5 rounded-xl bg-slate-950/60 border border-white/5">
                  {Object.values(FFXIV_JOBS)
                    .filter(j => j.id !== mainJob)
                    .map(j => {
                      const isFlex = flexJobs.includes(j.id);
                      return (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => toggleFlexJob(j.id)}
                          className={`py-1 px-1 rounded-md text-[11px] font-bold border transition-all ${
                            isFlex
                              ? 'bg-indigo-600/40 text-indigo-200 border-indigo-400'
                              : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'
                          }`}
                        >
                          {j.id}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Pestaña: Seguridad */}
          {activeTab === 'security' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contraseña Actual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Confirma tu contraseña actual"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Ingresa nueva contraseña para actualizar"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Mínimo 6 caracteres. Se almacena con hash bcrypt, nunca en claro.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer fijo con botón Salir/Cerrar y botón Guardar siempre visibles */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex-shrink-0 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <X className="w-4 h-4" />
            <span>Cerrar</span>
          </button>

          {activeTab === 'progress' && (
            <button
              type="button"
              disabled={loading}
              onClick={handleSaveProgress}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 text-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {loading
                  ? 'Guardando...'
                  : targetSubrole
                  ? `Guardar Progreso de ${SUBROLE_LABELS[targetSubrole]}`
                  : 'Guardar Progreso de Fases'}
              </span>
            </button>
          )}

          {activeTab === 'jobs' && (
            <button
              type="button"
              disabled={loading}
              onClick={handleSaveProfile}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 text-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Actualizar Jobs'}</span>
            </button>
          )}

          {activeTab === 'security' && (
            <button
              type="button"
              disabled={loading || !newPassword || !currentPassword}
              onClick={handleSaveProfile}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 text-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Cambiar Mi Contraseña'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
