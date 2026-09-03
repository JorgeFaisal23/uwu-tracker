'use client';

import { useState } from 'react';
import { Member, MemberAvailability, UserSession } from '@/types';
import { DAYS_OF_WEEK } from '@/lib/timezones';
import { getCurrentWeekDates } from '@/lib/date-utils';
import { Calendar, Save, Sparkles, Clock, Check } from 'lucide-react';

interface AvailabilityGridProps {
  availabilities: MemberAvailability[];
  members: Member[];
  session: UserSession;
  selectedTimezone: string;
  onSaveAvailability: (slots: { dayOfWeek: number; hourSlot: number }[]) => Promise<void>;
}

export default function AvailabilityGrid({
  availabilities,
  members,
  session,
  onSaveAvailability,
}: AvailabilityGridProps) {
  // Fechas de la semana en curso
  const currentWeekDates = getCurrentWeekDates();

  // Matriz de disponibilidad local del usuario conectado
  const currentMemberId = session.memberId;
  const initialUserSlots = currentMemberId
    ? availabilities
        .filter(a => a.memberId === currentMemberId)
        .map(a => `${a.dayOfWeek}_${a.hourSlot}`)
    : [];

  const [userSelectedSlots, setUserSelectedSlots] = useState<Set<string>>(
    new Set(initialUserSlots)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mapa de conteo de disponibilidad total por casilla (heatmap)
  const heatmapMap: Record<string, number> = {};
  for (const a of availabilities) {
    const key = `${a.dayOfWeek}_${a.hourSlot}`;
    heatmapMap[key] = (heatmapMap[key] || 0) + 1;
  }

  const toggleSlot = (day: number, hour: number) => {
    if (!currentMemberId) return;
    const key = `${day}_${hour}`;
    const next = new Set(userSelectedSlots);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setUserSelectedSlots(next);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!currentMemberId) return;
    setIsSaving(true);
    try {
      const slots = Array.from(userSelectedSlots).map(key => {
        const [d, h] = key.split('_');
        return { dayOfWeek: Number(d), hourSlot: Number(h) };
      });
      await onSaveAvailability(slots);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Atajos rápidos para marcar
  const markNightSlots = (day: number) => {
    const next = new Set(userSelectedSlots);
    // Marcar de 20:00 a 23:00
    for (let h = 20; h <= 23; h++) {
      next.add(`${day}_${h}`);
    }
    setUserSelectedSlots(next);
  };

  const clearDay = (day: number) => {
    const next = new Set(userSelectedSlots);
    for (let h = 0; h < 24; h++) {
      next.delete(`${day}_${h}`);
    }
    setUserSelectedSlots(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            Matriz Semanal
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
            Disponibilidad Horaria
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentMemberId
              ? 'Haz clic en las horas en que puedes asistir a incursiones de UWU. Para formar party se requiere al menos 1 hora de coincidencia.'
              : 'Inicia sesión con tu miembro para marcar o editar tus horarios.'}
          </p>
        </div>

        {currentMemberId && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Mi Disponibilidad'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Leyenda y Atajos */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs border border-white/5">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-slate-400 font-medium">Leyenda de Calor:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-900 border border-white/10" />
            <span className="text-slate-400 text-[11px]">0 miembros</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-cyan-950 border border-cyan-500/30" />
            <span className="text-slate-300 text-[11px]">1 - 4 miembros</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-indigo-800/80 border border-indigo-400/50" />
            <span className="text-indigo-200 text-[11px]">5 - 7 miembros</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-600/90 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-emerald-300 font-bold text-[11px]">8+ (¡Quórum de Party!)</span>
          </div>
        </div>

        {currentMemberId && (
          <div className="text-cyan-300 flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Casillas con borde cian brillante = Tu disponibilidad activa</span>
          </div>
        )}
      </div>

      {/* Cuadrícula 24h x 7 Días */}
      <div className="glass-card rounded-3xl p-4 sm:p-6 overflow-x-auto border border-white/10 shadow-2xl">
        <div className="min-w-[850px]">
          {/* Encabezado Días de la semana con fecha de la semana en curso */}
          <div className="grid grid-cols-8 gap-1.5 mb-2 text-center text-xs font-bold text-slate-300">
            <div className="py-2 text-slate-500 font-mono flex flex-col justify-center">
              <span>Hora</span>
              <span className="text-[10px] text-slate-600 font-normal">24h</span>
            </div>
            {DAYS_OF_WEEK.map(d => {
              const dayInfo = currentWeekDates.find(w => w.dayOfWeek === d.id);
              const isToday = dayInfo?.isToday;

              return (
                <div 
                  key={d.id} 
                  className={`py-2 rounded-xl border transition-all ${
                    isToday
                      ? 'bg-gradient-to-b from-cyan-950/70 to-slate-900 border-cyan-400/50 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                      : 'bg-slate-900/60 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className={isToday ? 'text-cyan-300 font-extrabold' : 'text-white'}>
                      {d.name}
                    </span>
                    {isToday && (
                      <span className="text-[9px] px-1 py-0.2 rounded-full bg-cyan-400 text-slate-950 font-black uppercase">
                        Hoy
                      </span>
                    )}
                  </div>
                  {dayInfo && (
                    <div className={`text-[10px] font-mono mt-0.5 ${isToday ? 'text-cyan-200' : 'text-slate-400'}`}>
                      {dayInfo.shortLabel}
                    </div>
                  )}
                  {currentMemberId && (
                    <div className="flex items-center justify-center gap-1 mt-1 text-[10px] font-normal">
                      <button
                        onClick={() => markNightSlots(d.id)}
                        className="text-cyan-400 hover:underline"
                        title="Marcar noches (20:00 - 23:00)"
                      >
                        Noches
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        onClick={() => clearDay(d.id)}
                        className="text-slate-500 hover:text-slate-300"
                        title="Limpiar este día"
                      >
                        Borrar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Filas de 00:00 a 23:00 */}
          <div className="space-y-1">
            {Array.from({ length: 24 }).map((_, hour) => (
              <div key={hour} className="grid grid-cols-8 gap-1.5 items-center">
                {/* Etiqueta de la hora */}
                <div className="text-center text-[11px] font-mono text-slate-400 py-1">
                  {hour.toString().padStart(2, '0')}:00
                </div>

                {/* 7 Celdas para cada día */}
                {DAYS_OF_WEEK.map(d => {
                  const key = `${d.id}_${hour}`;
                  const count = heatmapMap[key] || 0;
                  const isUserActive = userSelectedSlots.has(key);

                  // Color de calor
                  let heatColor = 'bg-slate-950/60 text-slate-500 border-white/5';
                  if (count >= 8) {
                    heatColor = 'bg-emerald-600/30 text-emerald-200 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)] font-bold';
                  } else if (count >= 5) {
                    heatColor = 'bg-indigo-900/40 text-indigo-200 border-indigo-500/30';
                  } else if (count >= 1) {
                    heatColor = 'bg-cyan-950/30 text-cyan-300 border-cyan-500/20';
                  }

                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={!currentMemberId}
                      onClick={() => toggleSlot(d.id, hour)}
                      className={`h-8 rounded-lg border text-xs flex items-center justify-center transition-all ${heatColor} ${
                        isUserActive
                          ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950 bg-cyan-500/30 !border-cyan-300 font-extrabold scale-105 z-10'
                          : ''
                      } ${
                        currentMemberId
                          ? 'hover:scale-105 hover:border-cyan-400/50 cursor-pointer active:scale-95'
                          : 'cursor-default'
                      }`}
                      title={`${d.name} ${hour}:00 - ${count} miembros disponibles`}
                    >
                      <span className="text-[11px]">{count > 0 ? `${count}p` : '-'}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
