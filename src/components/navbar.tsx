'use client';

import { useState } from 'react';
import { TIMEZONE_OPTIONS } from '@/lib/timezones';
import { UserSession } from '@/types';
import { 
  Sparkles, 
  Globe, 
  User, 
  ShieldCheck, 
  LogOut, 
  Compass, 
  Calendar, 
  TrendingUp, 
  Sliders
} from 'lucide-react';

interface NavbarProps {
  session: UserSession;
  activeTab: 'dashboard' | 'parties' | 'availability' | 'history';
  onTabChange: (tab: 'dashboard' | 'parties' | 'availability' | 'history') => void;
  selectedTimezone: string;
  onTimezoneChange: (tz: string) => void;
  onOpenMemberModal: () => void;
  onOpenAdminModal: () => void;
  onOpenProfileModal: () => void;
  onLogout: () => void;
}

export default function Navbar({
  session,
  activeTab,
  onTabChange,
  selectedTimezone,
  onTimezoneChange,
  onOpenMemberModal,
  onOpenAdminModal,
  onOpenProfileModal,
  onLogout,
}: NavbarProps) {
  const [showTzDropdown, setShowTzDropdown] = useState(false);

  const activeTz = TIMEZONE_OPTIONS.find(t => t.id === selectedTimezone) || TIMEZONE_OPTIONS[0];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#060814]/80 border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Brand */}
          <div 
            onClick={() => onTabChange('dashboard')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 p-0.5 shadow-[0_0_20px_rgba(56,189,248,0.4)] group-hover:scale-105 transition-all">
              <div className="w-full h-full bg-[#070a1a] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-wider text-white">
                  LUX OBSCURA
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                  FFXIV
                </span>
              </div>
              <div className="text-xs text-cyan-400 font-medium tracking-wide">
                Ultima Weapon Ultimate Tracker
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Compass className="w-4 h-4" />
              Nexo FC
            </button>

            <button
              onClick={() => onTabChange('parties')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'parties'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Parties UWU
            </button>

            <button
              onClick={() => onTabChange('availability')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'availability'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Disponibilidad
            </button>

            <button
              onClick={() => onTabChange('history')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Histórico Semanal
            </button>
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            {/* Selector de Zona Horaria */}
            <div className="relative">
              <button
                onClick={() => setShowTzDropdown(!showTzDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 hover:text-white hover:border-cyan-400/40 transition-all"
                title="Cambiar Zona Horaria"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium hidden sm:inline">{activeTz.label}</span>
                <span className="font-medium sm:hidden">TZ</span>
              </button>

              {showTzDropdown && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl glass-modal p-2 shadow-2xl z-50 border border-white/10">
                  <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                    Seleccionar Zona Horaria
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {TIMEZONE_OPTIONS.map(tz => (
                      <button
                        key={tz.id}
                        onClick={() => {
                          onTimezoneChange(tz.id);
                          setShowTzDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                          selectedTimezone === tz.id
                            ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-400/30'
                            : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span>{tz.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{tz.utcOffset}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Estado de Usuario */}
            {session.type === 'MEMBER' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenProfileModal}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/40 text-indigo-200 text-xs font-medium hover:border-cyan-400/50 transition-all hover:scale-105"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold">{session.characterName}</span>
                  <Sliders className="w-3 h-3 text-slate-400 ml-1" />
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-500/30 transition-all"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : session.type === 'ADMIN' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAdminModal}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:scale-105 transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Panel Admin</span>
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-500/30 transition-all"
                  title="Salir de Admin"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenMemberModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Miembros</span>
                </button>
                <button
                  onClick={onOpenAdminModal}
                  className="p-2 rounded-xl text-slate-400 hover:text-amber-300 hover:bg-amber-950/30 border border-transparent hover:border-amber-500/30 transition-all"
                  title="Acceso de Administrador"
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto gap-2 py-2 border-t border-white/5 text-xs">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
            }`}
          >
            Nexo FC
          </button>
          <button
            onClick={() => onTabChange('parties')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
              activeTab === 'parties' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
            }`}
          >
            Parties UWU
          </button>
          <button
            onClick={() => onTabChange('availability')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
              activeTab === 'availability' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
            }`}
          >
            Disponibilidad
          </button>
          <button
            onClick={() => onTabChange('history')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
              activeTab === 'history' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
            }`}
          >
            Histórico Semanal
          </button>
        </div>
      </div>
    </header>
  );
}
