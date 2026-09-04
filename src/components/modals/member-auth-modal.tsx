'use client';

import { useState } from 'react';
import { JobId, TankStance, UserSession } from '@/types';
import { FFXIV_JOBS, SUBROLE_LABELS } from '@/lib/ffxiv-jobs';
import { Sparkles, User, Lock, X } from 'lucide-react';

interface MemberAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (session: UserSession) => void;
}

export default function MemberAuthModal({ isOpen, onClose, onAuthSuccess }: MemberAuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [characterName, setCharacterName] = useState('');
  const [password, setPassword] = useState('');
  const [mainJob, setMainJob] = useState<JobId>('WAR');
  const [flexJobs, setFlexJobs] = useState<JobId[]>([]);
  const [tankStance, setTankStance] = useState<TankStance>('MT');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: tab,
          characterName,
          password,
          mainJob,
          flexJobs,
          tankStance: isTankSelected ? tankStance : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en autenticación');
      }

      // La sesión real es la cookie httpOnly que acaba de fijar el servidor; esto solo
      // le dice a la interfaz a quién está mostrando.
      onAuthSuccess(data.session);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl glass-modal p-6 sm:p-8 border border-cyan-500/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">Acceso de Miembro</h3>
            <p className="text-xs text-slate-400">Free Company Lux Obscura</p>
          </div>
        </div>

        {/* Pestañas Login / Registro */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 mb-5 border border-white/5">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'register'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Autoregistro Libre
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Nombre de Personaje</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={characterName}
                onChange={e => setCharacterName(e.target.value)}
                placeholder="Ej: Aria Thorne"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Contraseña Simple</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Tu contraseña personal (se guardará hasheada)"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {tab === 'register' && (
            <>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Main Job (Rol Principal)</label>
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
                    Preferencia de Tank (Postura)
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
                        {st === 'MT' ? 'Main Tank' : st === 'OT' ? 'Off Tank' : 'Ambos (Flex)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Flex Jobs Opcionales (Roles que también dominas)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-slate-950/60 border border-white/5">
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
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : tab === 'login' ? 'Entrar a Mi Perfil' : 'Completar Registro'}
          </button>
        </form>
      </div>
    </div>
  );
}
