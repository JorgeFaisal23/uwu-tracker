'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AstralCanvas from '@/components/astral-canvas';
import MemberAuthModal from '@/components/modals/member-auth-modal';
import AdminModal from '@/components/modals/admin-modal';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';

/**
 * Lo único que ve quien llega sin sesión.
 *
 * No recibe ningún dato de la FC —ni roster, ni horarios, ni disponibilidad— porque el
 * servidor no llega a pedirlos: `src/app/page.tsx` decide antes de renderizar. La
 * barrera de verdad son los route handlers, que desde ahora exigen sesión; esto es la
 * cara visible de esa misma regla.
 *
 * Tras identificarse se llama a `router.refresh()` en vez de montar la aplicación aquí:
 * así quien decide sigue siendo el servidor, leyendo la cookie que se acaba de fijar.
 */
export default function LoginGate() {
  const router = useRouter();
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen flex flex-col font-sans overflow-x-hidden">
      <AstralCanvas />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-3xl p-8 border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-cyan-300 bg-cyan-500/10 border border-cyan-400/30 rounded-full px-3 py-1">
                <Sparkles className="w-3 h-3" />
                Raid Ultimate
              </span>
            </div>

            <h1 className="text-3xl font-extrabold text-white tracking-tight aether-text-gradient">
              UWU Tracker
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Centro de progresión de <strong className="text-cyan-300">Lux Obscura</strong> para
              The Weapon&apos;s Refrain (Ultimate).
            </p>

            <div className="flex items-start gap-2.5 mt-6 p-3.5 rounded-2xl bg-slate-900/60 border border-white/10">
              <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                El roster, los horarios y la disponibilidad de la Free Company solo se
                muestran a sus miembros. Identifícate para continuar.
              </p>
            </div>

            <button
              onClick={() => setIsMemberModalOpen(true)}
              className="w-full mt-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors shadow-[0_0_24px_rgba(56,189,248,0.25)]"
            >
              Entrar como miembro
            </button>

            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="w-full mt-2.5 py-2.5 rounded-2xl border border-white/10 hover:border-white/25 hover:bg-white/5 text-slate-300 font-semibold text-xs transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Acceso de administrador
            </button>

            <p className="text-[11px] text-slate-500 mt-6 leading-relaxed text-center">
              ¿Aún no tienes cuenta? El alta requiere un código de invitación de un solo
              uso. Pídeselo a un oficial de la FC.
            </p>
          </div>
        </div>
      </main>

      <MemberAuthModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onAuthSuccess={() => router.refresh()}
      />

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        session={{ type: 'GUEST' }}
        members={[]}
        onAdminLoginSuccess={() => router.refresh()}
        onRefreshData={async () => {}}
      />
    </div>
  );
}
