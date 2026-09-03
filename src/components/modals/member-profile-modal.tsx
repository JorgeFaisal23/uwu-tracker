'use client';

import { useState } from 'react';
import { JobId, Member, TankStance, UwuProgress } from '@/types';
import { FFXIV_JOBS, SUBROLE_LABELS, UWU_PHASES } from '@/lib/ffxiv-jobs';
import { X, Sparkles, Sliders, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  progress: UwuProgress;
  onUpdateSuccess: () => Promise<void>;
}

export default function MemberProfileModal({
  isOpen,
  onClose,
  member,
  progress,
  onUpdateSuccess,
}: MemberProfileModalProps) {
  // Progreso en las 5 fases
  const [p1, setP1] = useState(progress.p1GarudaPct);
  const [p2, setP2] = useState(progress.p2IfritPct);
  const [p3, setP3] = useState(progress.p3TitanPct);
  const [p4, setP4] = useState(progress.p4UltimaPct);
  const [p5, setP5] = useState(progress.p5RoulettePct);

  // Perfil de jobs
  const [mainJob, setMainJob] = useState<JobId>(member.mainJob);
  const [flexJobs, setFlexJobs] = useState<JobId[]>(member.flexJobs || []);
  const [tankStance, setTankStance] = useState<TankStance>(member.tankStance || 'BOTH');
  const [newPassword, setNewPassword] = useState('');

  const [activeTab, setActiveTab] = useState<'progress' | 'jobs' | 'security'>('progress');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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
          memberId: member.id,
          p1GarudaPct: p1,
          p2IfritPct: p2,
          p3TitanPct: p3,
          p4UltimaPct: p4,
          p5RoulettePct: p5,
        }),
      });

      if (!res.ok) throw new Error('Error al actualizar progreso');

      // Celebración si completó o avanzó significativamente
      if (p5 >= 100 || (p4 >= 100 && progress.p4UltimaPct < 100)) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#a855f7', '#34d399', '#f59e0b'],
        });
      }

      setSuccessMsg('¡Progreso actualizado con éxito!');
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
          newPassword: newPassword || undefined,
        }),
      });

      if (!res.ok) throw new Error('Error al actualizar perfil');

      setSuccessMsg('¡Perfil actualizado con éxito!');
      await onUpdateSuccess();
      setNewPassword('');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl glass-modal p-6 sm:p-8 border border-indigo-500/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-indigo-400/30 text-indigo-300">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">
              Panel de Miembro: {member.characterName}
            </h3>
            <p className="text-xs text-cyan-400">Actualiza tu progreso en UWU y roles</p>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 mb-5 border border-white/5 text-xs">
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

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Pestaña: Progreso de las 5 Fases */}
        {activeTab === 'progress' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              Desliza el porcentaje alcanzado en cada una de las 5 partes de UWU (0 a 100% cada una):
            </div>

            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {UWU_PHASES.map(phase => {
                const val = 
                  phase.id === 1 ? p1 :
                  phase.id === 2 ? p2 :
                  phase.id === 3 ? p3 :
                  phase.id === 4 ? p4 : p5;

                const setVal = 
                  phase.id === 1 ? setP1 :
                  phase.id === 2 ? setP2 :
                  phase.id === 3 ? setP3 :
                  phase.id === 4 ? setP4 : setP5;

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
                      onChange={e => setVal(Number(e.target.value))}
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

            <button
              type="button"
              disabled={loading}
              onClick={handleSaveProgress}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Guardar Progreso de Fases'}</span>
            </button>
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
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-40 overflow-y-auto p-1.5 rounded-xl bg-slate-950/60 border border-white/5">
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

            <button
              type="button"
              disabled={loading}
              onClick={handleSaveProfile}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-xs"
            >
              {loading ? 'Guardando...' : 'Actualizar Jobs'}
            </button>
          </div>
        )}

        {/* Pestaña: Seguridad */}
        {activeTab === 'security' && (
          <div className="space-y-4 text-xs">
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
                La contraseña se almacena con hash criptográfico bcrypt.
              </p>
            </div>

            <button
              type="button"
              disabled={loading || !newPassword}
              onClick={handleSaveProfile}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-xs"
            >
              {loading ? 'Guardando...' : 'Cambiar Mi Contraseña'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
