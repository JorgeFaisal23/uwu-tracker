'use client';

import { useState, useEffect, useRef } from 'react';
import { MemberAvailability, UserSession } from '@/types';
import {
  DAYS_OF_WEEK,
  GUILD_TIMEZONE,
  TIMEZONE_OPTIONS,
  RAID_HOURS,
  FULL_HOURS_START_17,
  computeGridPositionRange,
  formatHourInZone,
} from '@/lib/timezones';
import { getCurrentWeekDates } from '@/lib/date-utils';
import { Save, Clock, Check, MousePointer, Layers, Undo2, Moon } from 'lucide-react';

interface AvailabilityGridProps {
  availabilities: MemberAvailability[];
  session: UserSession;
  /** Zona en la que el miembro quiere LEER la cuadrícula. Los datos se guardan siempre
   *  en la zona de la Free Company. */
  selectedTimezone: string;
  onSaveAvailability: (slots: { dayOfWeek: number; hourSlot: number }[]) => Promise<void>;
}

export default function AvailabilityGrid({
  availabilities,
  session,
  selectedTimezone,
  onSaveAvailability,
}: AvailabilityGridProps) {
  const showsConvertedTime = selectedTimezone !== GUILD_TIMEZONE;
  const timezoneLabel =
    TIMEZONE_OPTIONS.find(t => t.id === selectedTimezone)?.label ?? selectedTimezone;
  // Fechas de la semana en curso
  const currentWeekDates = getCurrentWeekDates();

  // Modo de visualización: horario habitual de raid (inicia a las 17:00) o 24h completas (iniciando a las 17:00)
  const [viewMode, setViewMode] = useState<'raid' | 'full'>('raid');
  const displayedHours = viewMode === 'raid' ? RAID_HOURS : FULL_HOURS_START_17;

  // Modo de selección: rango espacial (por defecto) o casilla individual
  const [selectionMode, setSelectionMode] = useState<'range' | 'single'>('range');

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
  const [mobileSelectedDay, setMobileSelectedDay] = useState<number>(() => new Date().getDay());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados para selección por rango (clic inicial y mover mouse sin mantener presionado)
  const [anchor, setAnchor] = useState<{ day: number; hour: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(true);

  // Soporte adicional para clic sostenido y arrastre
  const isMouseDown = useRef(false);
  const dragStart = useRef<{ day: number; hour: number } | null>(null);

  // Cancelar anclaje al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && anchor) {
        setAnchor(null);
        setHoveredCell(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [anchor]);

  // Mapa de conteo de disponibilidad total por casilla (heatmap)
  const heatmapMap: Record<string, number> = {};
  for (const a of availabilities) {
    const key = `${a.dayOfWeek}_${a.hourSlot}`;
    heatmapMap[key] = (heatmapMap[key] || 0) + 1;
  }

  // Casillas en previsualización de rango espacial 2D (posición en pantalla, no tiempo)
  const activeTarget = hoveredCell || anchor;
  const activeRangeSlots = anchor
    ? computeGridPositionRange(anchor, activeTarget!, displayedHours, DAYS_OF_WEEK)
    : [];
  const activeRangeKeys = new Set(activeRangeSlots.map(s => `${s.day}_${s.hour}`));

  // Aplicar un rango espacial de casillas
  const commitRange = (
    startCell: { day: number; hour: number },
    endCell: { day: number; hour: number },
    adding: boolean
  ) => {
    const slots = computeGridPositionRange(startCell, endCell, displayedHours, DAYS_OF_WEEK);
    const next = new Set(userSelectedSlots);
    for (const s of slots) {
      const key = `${s.day}_${s.hour}`;
      if (adding) {
        next.add(key);
      } else {
        next.delete(key);
      }
    }
    setUserSelectedSlots(next);
    setSaveSuccess(false);
    setAnchor(null);
    setHoveredCell(null);
  };

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

  const handleCellClick = (day: number, hour: number) => {
    if (!currentMemberId) return;

    if (selectionMode === 'single') {
      toggleSlot(day, hour);
      return;
    }

    if (anchor) {
      // Segundo clic: finaliza el rango y selecciona todas las casillas intermedias
      commitRange(anchor, { day, hour }, isAdding);
    } else {
      // Primer clic: ancla el inicio del rango
      const key = `${day}_${hour}`;
      const adding = !userSelectedSlots.has(key);
      setIsAdding(adding);
      setAnchor({ day, hour });
      setHoveredCell({ day, hour });
    }
  };

  const handleCellMouseEnter = (day: number, hour: number) => {
    if (!currentMemberId) return;
    if (anchor) {
      setHoveredCell({ day, hour });
    }
  };

  const handleCellMouseDown = (day: number, hour: number) => {
    if (!currentMemberId) return;
    isMouseDown.current = true;
    dragStart.current = { day, hour };
  };

  const handleCellMouseUp = (day: number, hour: number) => {
    if (!currentMemberId) return;
    const wasDragging =
      isMouseDown.current &&
      dragStart.current &&
      (dragStart.current.day !== day || dragStart.current.hour !== hour);

    isMouseDown.current = false;

    // Si el usuario prefirió arrastrar con el botón presionado
    if (wasDragging && dragStart.current && selectionMode === 'range') {
      const key = `${dragStart.current.day}_${dragStart.current.hour}`;
      const adding = !userSelectedSlots.has(key);
      commitRange(dragStart.current, { day, hour }, adding);
      dragStart.current = null;
    }
  };

  const handleSave = async () => {
    if (!currentMemberId) return;
    setIsSaving(true);
    setAnchor(null);
    setHoveredCell(null);
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
    setAnchor(null);
    setHoveredCell(null);
    const next = new Set(userSelectedSlots);
    // Marcar de 20:00 a 23:00
    for (let h = 20; h <= 23; h++) {
      next.add(`${day}_${h}`);
    }
    setUserSelectedSlots(next);
  };

  const clearDay = (day: number) => {
    setAnchor(null);
    setHoveredCell(null);
    const next = new Set(userSelectedSlots);
    for (let h = 0; h < 24; h++) {
      next.delete(`${day}_${h}`);
    }
    setUserSelectedSlots(next);
  };

  const anchorDayName = anchor
    ? DAYS_OF_WEEK.find(d => d.id === anchor.day)?.name ?? ''
    : '';

  return (
    <div className="space-y-6 select-none">
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
              ? 'Haz clic en una hora y mueve el cursor para seleccionar bloques de disponibilidad por posición en la cuadrícula.'
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

      {/* Barra de Controles: Horario y Modo de Selección */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs border border-white/5">
        {/* Selector de Horario */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-medium flex items-center gap-1.5 mr-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Vista Horaria:
          </span>
          <div className="flex rounded-xl bg-slate-900/80 p-1 border border-white/5">
            <button
              type="button"
              onClick={() => {
                setViewMode('raid');
                setAnchor(null);
                setHoveredCell(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs ${
                viewMode === 'raid'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Horario Raid (17:00 a 23:00)
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('full');
                setAnchor(null);
                setHoveredCell(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs ${
                viewMode === 'full'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              24 Horas (Inicia a las 17:00)
            </button>
          </div>
        </div>

        {/* Modo de Selección (Solo escritorio / ratón) */}
        {currentMemberId && (
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium flex items-center gap-1.5 mr-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Modo Selección:
            </span>
            <div className="flex rounded-xl bg-slate-900/80 p-1 border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setSelectionMode('range');
                  setAnchor(null);
                  setHoveredCell(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 ${
                  selectionMode === 'range'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Haz clic en una casilla y mueve el mouse a otra para seleccionar el bloque rectangular"
              >
                <MousePointer className="w-3 h-3" />
                <span>Rango (Clic y mover)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectionMode('single');
                  setAnchor(null);
                  setHoveredCell(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs ${
                  selectionMode === 'single'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Casilla Individual
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Banner flotante de Selección por Rango Activa */}
      {anchor && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/90 via-indigo-950/90 to-slate-900/90 border border-cyan-400/40 shadow-[0_0_25px_rgba(56,189,248,0.25)] flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5 text-cyan-200">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span>
              Inicio del bloque en <strong>{anchorDayName} {anchor.hour.toString().padStart(2, '0')}:00</strong>.
              Mueve el cursor hacia otra casilla y haz clic para {isAdding ? 'marcar' : 'desmarcar'}
              {activeRangeSlots.length > 0 ? (
                <strong className="text-cyan-300"> ({activeRangeSlots.length} casillas entre ambas)</strong>
              ) : ''}
              .
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAnchor(null);
              setHoveredCell(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-bold border border-white/10 transition-all hover:scale-105 flex items-center gap-1.5 shadow-sm"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Cancelar Selección (Esc)</span>
          </button>
        </div>
      )}

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
          <div className="text-cyan-300 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Casillas con borde cian brillante = Tu disponibilidad activa</span>
          </div>
        )}
      </div>

      {/* Cuadrícula Horas x 7 Días (Escritorio / Tablet >= sm) */}
      <div className="hidden sm:block glass-card rounded-3xl p-4 sm:p-6 overflow-x-auto border border-white/10 shadow-2xl">
        <div
          className="min-w-[850px]"
          onMouseLeave={() => {
            if (anchor) setHoveredCell(null);
          }}
        >
          {/* Encabezado Días de la semana con fecha de la semana en curso */}
          <div className="grid grid-cols-8 gap-1.5 mb-2 text-center text-xs font-bold text-slate-300">
            <div className="py-2 text-slate-500 font-mono flex flex-col justify-center">
              <span>Hora</span>
              <span className="text-[10px] text-slate-600 font-normal">CDMX</span>
              {showsConvertedTime && (
                <span className="text-[10px] text-cyan-500/80 font-normal">
                  {timezoneLabel}
                </span>
              )}
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

          {/* Filas horarias (empieza a las 17:00) */}
          <div className="space-y-1">
            {displayedHours.map(hour => (
              <div key={hour} className="grid grid-cols-8 gap-1.5 items-center">
                {/* Etiqueta de la hora */}
                <div className="text-center text-[11px] font-mono text-slate-400 py-1 leading-tight">
                  <div className="font-semibold">{hour.toString().padStart(2, '0')}:00</div>
                  {showsConvertedTime && (
                    <div className="text-[10px] text-cyan-400/80">
                      {formatHourInZone(1, hour, selectedTimezone).label}
                    </div>
                  )}
                </div>

                {/* 7 Celdas para cada día */}
                {DAYS_OF_WEEK.map(d => {
                  const key = `${d.id}_${hour}`;
                  const count = heatmapMap[key] || 0;
                  const isUserActive = userSelectedSlots.has(key);
                  const isAnchorCell = anchor?.day === d.id && anchor?.hour === hour;
                  const isInPreview = activeRangeKeys.has(key);

                  // Color de calor base
                  let heatColor = 'bg-slate-950/60 text-slate-500 border-white/5';
                  if (count >= 8) {
                    heatColor = 'bg-emerald-600/30 text-emerald-200 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)] font-bold';
                  } else if (count >= 5) {
                    heatColor = 'bg-indigo-900/40 text-indigo-200 border-indigo-500/30';
                  } else if (count >= 1) {
                    heatColor = 'bg-cyan-950/30 text-cyan-300 border-cyan-500/20';
                  }

                  // Resalte dinámico por previsualización de rango o selección activa
                  let activeClasses = '';
                  if (isInPreview) {
                    if (isAdding) {
                      activeClasses = 'ring-2 ring-cyan-300 ring-offset-1 ring-offset-slate-950 bg-cyan-400/40 !border-cyan-200 text-white font-black scale-105 z-20 shadow-[0_0_15px_rgba(56,189,248,0.5)]';
                    } else {
                      activeClasses = 'ring-2 ring-rose-500 ring-offset-1 ring-offset-slate-950 bg-rose-950/70 !border-rose-400 text-rose-200 font-bold scale-105 z-20 shadow-[0_0_12px_rgba(244,63,94,0.4)] opacity-75';
                    }
                  } else if (isUserActive) {
                    activeClasses = 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950 bg-cyan-500/30 !border-cyan-300 font-extrabold scale-105 z-10';
                  }

                  if (isAnchorCell) {
                    activeClasses += ' border-2 !border-white ring-2 ring-cyan-200 animate-pulse';
                  }

                  const cursorClass = currentMemberId
                    ? selectionMode === 'range'
                      ? 'cursor-crosshair hover:scale-105 hover:border-cyan-400/50'
                      : 'cursor-pointer hover:scale-105 hover:border-cyan-400/50'
                    : 'cursor-default';

                  const tooltipText = isInPreview
                    ? `Haz clic para ${isAdding ? 'marcar' : 'desmarcar'} este bloque`
                    : buildSlotTitle(d.id, d.name, hour, count, selectedTimezone);

                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={!currentMemberId}
                      onClick={() => handleCellClick(d.id, hour)}
                      onMouseEnter={() => handleCellMouseEnter(d.id, hour)}
                      onMouseDown={() => handleCellMouseDown(d.id, hour)}
                      onMouseUp={() => handleCellMouseUp(d.id, hour)}
                      className={`h-8 rounded-lg border text-xs flex items-center justify-center transition-all ${heatColor} ${activeClasses} ${cursorClass}`}
                      title={tooltipText}
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

      {/* Vista Móvil (< sm): 1 Día a la vez, sin scroll horizontal */}
      <div className="sm:hidden space-y-4">
        {/* Selector de Día (7 botones / pestañas) */}
        <div className="glass-card rounded-2xl p-2.5 border border-white/10 shadow-lg">
          <div className="grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map(d => {
              const dayInfo = currentWeekDates.find(w => w.dayOfWeek === d.id);
              const isToday = dayInfo?.isToday;
              const isSelected = mobileSelectedDay === d.id;

              // Contar casillas activas del usuario en este día
              let userSlotsInDay = 0;
              for (let h = 0; h < 24; h++) {
                if (userSelectedSlots.has(`${d.id}_${h}`)) userSlotsInDay++;
              }

              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setMobileSelectedDay(d.id)}
                  className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all border ${
                    isSelected
                      ? 'bg-gradient-to-b from-cyan-500/30 to-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                      : isToday
                      ? 'bg-slate-900/90 border-cyan-500/30 text-slate-200'
                      : 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className={`text-[11px] font-extrabold ${isSelected ? 'text-cyan-300' : ''}`}>
                    {d.name.slice(0, 3)}
                  </span>
                  <span className="text-[9px] font-mono mt-0.5 opacity-80">
                    {dayInfo ? dayInfo.shortLabel.split(' ')[0] : ''}
                  </span>
                  {userSlotsInDay > 0 && (
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan-400 ring-1 ring-cyan-300 shadow-[0_0_4px_rgba(56,189,248,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cabecera del Día Seleccionado y Acciones Rápidas */}
        {(() => {
          const activeDayObj = DAYS_OF_WEEK.find(d => d.id === mobileSelectedDay) || DAYS_OF_WEEK[0];
          const dayInfo = currentWeekDates.find(w => w.dayOfWeek === activeDayObj.id);
          const isToday = dayInfo?.isToday;

          let userCountInSelected = 0;
          for (let h = 0; h < 24; h++) {
            if (userSelectedSlots.has(`${activeDayObj.id}_${h}`)) userCountInSelected++;
          }

          return (
            <div className="glass-card rounded-2xl p-3.5 border border-white/10 shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      {activeDayObj.name}
                      {dayInfo && (
                        <span className="text-xs font-mono text-cyan-300 font-normal">
                          ({dayInfo.shortLabel})
                        </span>
                      )}
                    </h3>
                    {isToday && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-black uppercase tracking-wider">
                        Hoy
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {userCountInSelected > 0
                      ? `${userCountInSelected} ${userCountInSelected === 1 ? 'hora marcada' : 'horas marcadas'} por ti`
                      : 'Sin horas marcadas para este día'}
                  </p>
                </div>

                {currentMemberId && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => markNightSlots(activeDayObj.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-[11px] font-bold transition-all flex items-center gap-1 active:scale-95"
                      title="Marcar de 20:00 a 23:00"
                    >
                      <Moon className="w-3 h-3 text-cyan-400" />
                      <span>Noches</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => clearDay(activeDayObj.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-950/40 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 text-[11px] font-medium transition-all active:scale-95"
                      title="Limpiar este día"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>

              {/* Lista Vertical de Horas */}
              <div className="space-y-2 pt-1">
                {displayedHours.map(hour => {
                  const key = `${activeDayObj.id}_${hour}`;
                  const count = heatmapMap[key] || 0;
                  const isUserActive = userSelectedSlots.has(key);

                  // Estado visual de calor
                  let heatBg = 'bg-slate-900/60 border-white/5 text-slate-400';
                  let quorumBadge = null;

                  if (count >= 8) {
                    heatBg = 'bg-emerald-950/40 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]';
                    quorumBadge = (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        {count}p • ¡Quórum!
                      </span>
                    );
                  } else if (count >= 5) {
                    heatBg = 'bg-indigo-950/40 border-indigo-500/30';
                    quorumBadge = (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">
                        {count}p listos
                      </span>
                    );
                  } else if (count >= 1) {
                    heatBg = 'bg-cyan-950/20 border-cyan-500/20';
                    quorumBadge = (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                        {count}p
                      </span>
                    );
                  } else {
                    quorumBadge = (
                      <span className="text-[10px] text-slate-500">
                        0 disponibles
                      </span>
                    );
                  }

                  const activeRowStyle = isUserActive
                    ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950 !border-cyan-300 bg-cyan-500/15'
                    : '';

                  return (
                    <div
                      key={hour}
                      onClick={() => toggleSlot(activeDayObj.id, hour)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${heatBg} ${activeRowStyle} ${
                        currentMemberId ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'
                      }`}
                    >
                      {/* Horario */}
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-left">
                          <span className="text-sm font-bold text-white">
                            {hour.toString().padStart(2, '0')}:00
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            a {(hour + 1).toString().padStart(2, '0')}:00 CDMX
                          </span>
                          {showsConvertedTime && (
                            <span className="text-[10px] text-cyan-400/90 block">
                              {formatHourInZone(1, hour, selectedTimezone).label} {timezoneLabel}
                            </span>
                          )}
                        </div>
                        <div>{quorumBadge}</div>
                      </div>

                      {/* Botón / Estado interactivo */}
                      {currentMemberId && (
                        <div>
                          {isUserActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-400 text-slate-950 font-black text-xs shadow-[0_0_10px_rgba(56,189,248,0.4)]">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Disponible</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 font-medium text-xs">
                              + Marcar
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/**
 * Texto del tooltip de una casilla. Cuando el miembro está leyendo la cuadrícula en
 * otra zona horaria, añade la equivalencia con su día correspondiente, que puede caer
 * en la víspera o al día siguiente.
 */
function buildSlotTitle(
  dayOfWeek: number,
  dayName: string,
  hour: number,
  count: number,
  timezone: string
): string {
  const base = `${dayName} ${hour.toString().padStart(2, '0')}:00 (hora FC) — ${count} disponibles`;

  if (timezone === GUILD_TIMEZONE) return base;

  const shifted = formatHourInZone(dayOfWeek, hour, timezone);
  const shiftedDay = DAYS_OF_WEEK.find(d => d.id === shifted.dayOfWeek);

  return `${base}
En tu zona: ${shiftedDay?.name ?? ''} ${shifted.label}`;
}
