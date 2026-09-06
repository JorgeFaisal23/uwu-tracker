'use client';

import { useCallback, useEffect, useState } from 'react';
import { InviteToken, Member, UserSession } from '@/types';
import { ShieldCheck, Lock, User, KeyRound, Trash2, X, Check, Ticket, Copy, Ban } from 'lucide-react';

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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Invitaciones
  const [tab, setTab] = useState<'members' | 'invites'>('members');
  const [invites, setInvites] = useState<InviteToken[]>([]);
  const [inviteLabel, setInviteLabel] = useState('');
  const [inviteDays, setInviteDays] = useState('7');
  const [nuevoToken, setNuevoToken] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cargarInvitaciones = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/invites');
      if (!res.ok) return;
      const data = await res.json();
      setInvites(data.invites ?? []);
    } catch {
      // Un fallo al listar no debe romper el panel; el error real se ve al crear o revocar.
    }
  }, []);

  const handleCrearInvitacion = async () => {
    setLoading(true);
    setError(null);
    setNuevoToken(null);
    setCopiado(false);
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: inviteLabel.trim() || undefined,
          expiresInDays: inviteDays === '' ? null : Number(inviteDays),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la invitación');

      setNuevoToken(data.token);
      setInviteLabel('');
      await cargarInvitaciones();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleRevocar = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invites/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al revocar');

      setActionSuccess('Invitación revocada.');
      setTimeout(() => setActionSuccess(null), 3000);
      await cargarInvitaciones();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al revocar');
    } finally {
      setLoading(false);
    }
  };

  const copiarToken = async () => {
    if (!nuevoToken) return;
    try {
      await navigator.clipboard.writeText(nuevoToken);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles el token sigue visible para seleccionarlo a mano.
    }
  };

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-3xl glass-modal border border-amber-500/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden my-auto">
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-white/5 flex-shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-3">
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
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all ml-2 shrink-0"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 flex-1 overflow-y-auto min-h-0 space-y-4">

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
            {/* Pestañas */}
            <div className="flex rounded-xl bg-slate-900/80 p-1 border border-white/5">
              <button
                type="button"
                onClick={() => { setTab('members'); setError(null); }}
                className={`flex-1 py-2 font-bold rounded-lg transition-all ${
                  tab === 'members'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Miembros ({members.length})
              </button>
              <button
                type="button"
                onClick={() => { setTab('invites'); setError(null); cargarInvitaciones(); }}
                className={`flex-1 py-2 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  tab === 'invites'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Invitaciones</span>
              </button>
            </div>

            {tab === 'invites' ? (
              <div className="space-y-4">
                {/* Token recién creado: es la única vez que puede verse */}
                {nuevoToken && (
                  <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                    <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>Invitación creada. Cópiala ahora.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-emerald-500/30 text-emerald-200 font-mono text-sm tracking-wider break-all">
                        {nuevoToken}
                      </code>
                      <button
                        onClick={copiarToken}
                        className="p-2 rounded-lg bg-emerald-600/30 text-emerald-200 hover:bg-emerald-600/50 transition-all shrink-0"
                        title="Copiar"
                      >
                        {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-400/70">
                      No se volverá a mostrar: en la base solo queda su hash. Si la pierdes,
                      revócala y crea otra.
                    </p>
                  </div>
                )}

                {/* Crear */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2.5">
                  <div className="font-semibold text-slate-300">Nueva invitación</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteLabel}
                      onChange={e => setInviteLabel(e.target.value)}
                      placeholder="¿Para quién? (opcional)"
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs placeholder:text-slate-500"
                    />
                    <select
                      value={inviteDays}
                      onChange={e => setInviteDays(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs"
                    >
                      <option value="1">1 día</option>
                      <option value="7">7 días</option>
                      <option value="30">30 días</option>
                      <option value="">Sin caducidad</option>
                    </select>
                  </div>
                  <button
                    onClick={handleCrearInvitacion}
                    disabled={loading}
                    className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold transition-all disabled:opacity-50"
                  >
                    {loading ? 'Generando...' : 'Generar invitación'}
                  </button>
                </div>

                {/* Listado */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {invites.length === 0 && (
                    <p className="text-slate-500 text-center py-4">
                      No hay invitaciones. Genera una para que alguien pueda registrarse.
                    </p>
                  )}
                  {invites.map(inv => {
                    const estilo = {
                      PENDING: 'bg-cyan-500/20 text-cyan-300',
                      USED: 'bg-slate-600/30 text-slate-400',
                      EXPIRED: 'bg-orange-500/20 text-orange-300',
                      REVOKED: 'bg-red-500/20 text-red-300',
                    }[inv.status];
                    const etiqueta = {
                      PENDING: 'Pendiente',
                      USED: 'Usada',
                      EXPIRED: 'Caducada',
                      REVOKED: 'Revocada',
                    }[inv.status];

                    return (
                      <div
                        key={inv.id}
                        className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${estilo}`}>
                              {etiqueta}
                            </span>
                            <span className="text-white font-semibold truncate">
                              {inv.label || 'Sin etiqueta'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {inv.usedByName
                              ? `La usó ${inv.usedByName}`
                              : `Creada el ${new Date(inv.createdAt).toLocaleDateString('es')}`}
                            {inv.expiresAt && inv.status === 'PENDING' &&
                              ` · caduca el ${new Date(inv.expiresAt).toLocaleDateString('es')}`}
                          </div>
                        </div>

                        {inv.status === 'PENDING' && (
                          <button
                            onClick={() => handleRevocar(inv.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all shrink-0"
                            title="Revocar"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
            <>
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold">Miembros de la Free Company ({members.length})</span>
              <span className="text-[11px] text-slate-400">Acciones de mantenimiento</span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {members.map(m => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-3 overflow-hidden"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="truncate">{m.characterName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono shrink-0">
                        {m.mainJob} {m.tankStance ? `(${m.tankStance})` : ''}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 break-words">
                      Flex:{' '}
                      {m.flexJobs && m.flexJobs.length > 0 ? (
                        m.flexJobs.length > 4 ? (
                          <span title={m.flexJobs.join(', ')}>
                            {m.flexJobs.slice(0, 3).join(', ')}{' '}
                            <span className="px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                              +{m.flexJobs.length - 3}
                            </span>
                          </span>
                        ) : (
                          m.flexJobs.join(', ')
                        )
                      ) : (
                        'Ninguno'
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
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
            </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
