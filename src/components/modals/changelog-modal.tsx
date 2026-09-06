'use client';

import { useEffect, useState } from 'react';
import { CHANGELOG, LATEST_RELEASE } from '@/lib/changelog';
import { Sparkles, X, ChevronDown } from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Nombre del personaje, para saludar cuando la ventana sale sola al entrar. */
  characterName?: string;
  /** true cuando aparece por sí sola tras iniciar sesión, false si la pidió el usuario. */
  isAutoOpened?: boolean;
}

/**
 * Las novedades de la versión, en lenguaje de jugador.
 *
 * Sale sola una vez por persona y versión, y se puede volver a abrir desde el panel de
 * personaje. Las versiones anteriores quedan plegadas al fondo.
 */
export default function ChangelogModal(props: ChangelogModalProps) {
  // Cerrar desmonta el contenido: así cada apertura empieza igual, con el historial
  // de versiones anteriores plegado.
  if (!props.isOpen) return null;

  return <ChangelogModalContent {...props} />;
}

function ChangelogModalContent({
  onClose,
  characterName,
  isAutoOpened = false,
}: ChangelogModalProps) {
  const [showOlder, setShowOlder] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const olderReleases = CHANGELOG.slice(1);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-3xl glass-modal border border-cyan-500/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden my-auto">
        {/* Cabecera fija */}
        <div className="flex items-start justify-between gap-3 p-5 sm:p-6 pb-4 border-b border-white/5 flex-shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-400/30 text-cyan-300 shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  Novedades
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  v{LATEST_RELEASE.version}
                </span>
              </div>
              <p className="text-xs text-cyan-400/90 truncate">
                {isAutoOpened && characterName
                  ? `Bienvenido de vuelta, ${characterName}. Esto es lo nuevo:`
                  : LATEST_RELEASE.date}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con scroll interno */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto min-h-0 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            {LATEST_RELEASE.headline}
          </p>

          <div className="space-y-2.5">
            {LATEST_RELEASE.entries.map((entry, i) => (
              <div
                key={entry.title}
                className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono font-bold text-cyan-400/70 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h4 className="text-sm font-bold text-white">{entry.title}</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mt-1.5 pl-6">
                  {entry.description}
                </p>
              </div>
            ))}
          </div>

          {/* Versiones anteriores, plegadas: lo nuevo es lo que importa al entrar. */}
          {olderReleases.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowOlder(v => !v)}
                className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${showOlder ? 'rotate-180' : ''}`}
                />
                <span>
                  {showOlder ? 'Ocultar versiones anteriores' : 'Ver versiones anteriores'}
                </span>
              </button>

              {showOlder && (
                <div className="mt-3 space-y-4">
                  {olderReleases.map(release => (
                    <div key={release.version} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                          v{release.version}
                        </span>
                        <span className="text-[10px] text-slate-500">{release.date}</span>
                      </div>
                      <ul className="space-y-1.5 pl-1">
                        {release.entries.map(entry => (
                          <li key={entry.title} className="text-xs text-slate-400 leading-relaxed">
                            <strong className="text-slate-300 font-semibold">{entry.title}.</strong>{' '}
                            {entry.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer fijo */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex-shrink-0 flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-500 hidden sm:block">
            Puedes releerlo desde tu panel de personaje.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all hover:scale-[1.01] active:scale-95 text-xs flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Entendido</span>
          </button>
        </div>
      </div>
    </div>
  );
}
