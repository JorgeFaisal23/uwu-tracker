'use client';

import { useState } from 'react';
import { Member, UserSession } from '@/types';
import { ShieldCheck, Lock, User, KeyRound, Trash2, X, Check } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  members: Member[];
  onAdminLoginSuccess: () => void;
  onRefreshData: () => Promise<void>;
}

export default function AdminModal({
  isOpen,
  onClose,
  session,
  members,
  onAdminLoginSuccess,
  onRefreshData,
}: AdminModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados para reset de clave de miembro
  const [resettingMemberId, setResettingMemberId] = useState<string | null>(null);
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciales inválidas');
      }

      onAdminLoginSuccess();
      setPassword('');
      setUsername('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (memberId: string) => {
    if (!newMemberPassword) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetPassword',
          newPassword: newMemberPassword,
        }),
      });

      if (!res.ok) throw new Error('Error al resetear contraseña');

      setActionSuccess('Contraseña restablecida con éxito.');
      setResettingMemberId(null);
      setNewMemberPassword('');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al resetear');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${name} de la lista de miembros?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');

      setActionSuccess(`Miembro ${name} eliminado.`);
      await onRefreshData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-3xl glass-modal p-6 sm:p-8 border border-amber-500/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">
              {session.type === 'ADMIN' ? 'Panel de Control de Administrador' : 'Acceso de Administrador'}
            </h3>
            <p className="text-xs text-amber-300/80">Gestión de miembros y raid de Lux Obscura</p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            {error}
          </div>
        )}

        {actionSuccess && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Si NO está logueado como Admin: Formulario de Login */}
        {session.type !== 'ADMIN' ? (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Usuario Admin</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Usuario administrador"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Contraseña de administrador"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión como Admin'}
            </button>
          </form>
        ) : (
          /* Si YA está logueado como Admin: Panel de Gestión */
          <div className="space-y-5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold">Miembros de la Free Company ({members.length})</span>
              <span className="text-[11px] text-slate-400">Acciones de mantenimiento</span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {members.map(m => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{m.characterName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                        {m.mainJob} {m.tankStance ? `(${m.tankStance})` : ''}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Flex: {m.flexJobs && m.flexJobs.length > 0 ? m.flexJobs.join(', ') : 'Ninguno'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setResettingMemberId(resettingMemberId === m.id ? null : m.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-950/30 transition-all"
                      title="Resetear Contraseña"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(m.id, m.characterName)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all"
                      title="Eliminar Miembro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Formulario desplegable para resetear clave */}
                  {resettingMemberId === m.id && (
                    <div className="w-full mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nueva contraseña"
                        value={newMemberPassword}
                        onChange={e => setNewMemberPassword(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs"
                      />
                      <button
                        onClick={() => handleResetPassword(m.id)}
                        disabled={!newMemberPassword}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-50"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
