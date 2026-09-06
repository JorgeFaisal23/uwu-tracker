'use client';

import { useState, useMemo } from 'react';
import { PartyCombination, UserSession, JobId, SlotRole } from '@/types';
import { FFXIV_JOBS } from '@/lib/ffxiv-jobs';
import JobBadge from './job-badge';
import {
  Search,
  X,
  Filter,
  ArrowUpDown,
  ShieldCheck,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Award,
  Sparkles,
  AlertCircle,
  Users,
} from 'lucide-react';
import {
  SlotPartyFilters,
  DEFAULT_SLOT_PARTY_FILTERS,
  filterAndSortSlotParties,
  paginateList,
  getPhaseFromScore,
  getPhaseLabel,
  formatCombinationForDiscordText,
} from '@/lib/slot-party-filters';

interface SlotPartiesBrowserProps {
  combinations: PartyCombination[];
  slotKey: string;
  dayName: string;
  hourLabel: string;
  session: UserSession;
  onSchedule: (comb: PartyCombination) => void;
  onCopySuccess?: (text: string) => void;
}

const ROLE_BADGE_STYLES: Record<SlotRole, string> = {
  MT: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  OT: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  PH: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  SH: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  M1: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  M2: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  PR: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  C: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
};

const ALL_JOBS = Object.keys(FFXIV_JOBS) as JobId[];

export default function SlotPartiesBrowser({
  combinations,
  slotKey,
  dayName,
  hourLabel,
  session,
  onSchedule,
  onCopySuccess,
}: SlotPartiesBrowserProps) {
  const [filters, setFilters] = useState<SlotPartyFilters>(DEFAULT_SLOT_PARTY_FILTERS);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [copiedCombId, setCopiedCombId] = useState<string | null>(null);

  // Lista de miembros únicos presentes en este horario para autocompletar / sugerencias
  const uniqueMembers = useMemo(() => {
    const map = new Map<string, string>();
    for (const comb of combinations) {
      for (const slot of Object.values(comb.slots)) {
        map.set(slot.member.id, slot.member.characterName);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [combinations]);

  // Aplicar filtros y orden
  const filteredCombinations = useMemo(() => {
    return filterAndSortSlotParties(combinations, filters);
  }, [combinations, filters]);

  // Aplicar paginación
  const pagination = useMemo(() => {
    return paginateList(filteredCombinations, currentPage, pageSize);
  }, [filteredCombinations, currentPage, pageSize]);

  // Manejar cambio de filtro con reseteo de página
  const updateFilter = <K extends keyof SlotPartyFilters>(
    key: K,
    value: SlotPartyFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_SLOT_PARTY_FILTERS);
    setCurrentPage(1);
  };

  const isFilterActive =
    filters.search !== '' ||
    filters.job !== 'ALL' ||
    filters.roleForSearch !== 'ALL' ||
    filters.minMainJobs > 0 ||
    filters.phase !== 'ALL' ||
    filters.sortBy !== 'default';

  const handleCopyDiscord = async (comb: PartyCombination) => {
    const text = formatCombinationForDiscordText(comb, dayName, hourLabel);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedCombId(comb.id);
        setTimeout(() => setCopiedCombId(null), 2500);
        return;
      }
    } catch (err) {
      console.warn('Error al copiar al portapapeles:', err);
    }
    if (onCopySuccess) {
      onCopySuccess(text);
    }
  };

  // Renderizador principal del contenido de la vista
  const content = (
    <div className="space-y-4">
      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Filtros para {dayName} {hourLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isFilterActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1 transition-all"
              >
                <X className="w-3 h-3" />
                Limpiar filtros
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs transition-all"
              title={isMaximized ? 'Restaurar vista reducida' : 'Ver en pantalla completa'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Controles de Entrada */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Búsqueda por Nombre de Personaje */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              placeholder="Buscar personaje..."
              list={`members-list-${slotKey}`}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-sans"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => updateFilter('search', '')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <datalist id={`members-list-${slotKey}`}>
              {uniqueMembers.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          {/* Filtro por Job */}
          <div>
            <select
              value={filters.job}
              onChange={e => updateFilter('job', e.target.value as JobId | 'ALL')}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition-all font-sans cursor-pointer"
            >
              <option value="ALL">Todos los Jobs</option>
              {ALL_JOBS.map(jobId => (
                <option key={jobId} value={jobId}>
                  {jobId} - {FFXIV_JOBS[jobId].name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Puesto / Rol para la Búsqueda o Job */}
          <div>
            <select
              value={filters.roleForSearch}
              onChange={e => updateFilter('roleForSearch', e.target.value as SlotRole | 'ALL')}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition-all font-sans cursor-pointer"
            >
              <option value="ALL">Cualquier Puesto</option>
              <option value="MT">MT (Main Tank)</option>
              <option value="OT">OT (Off Tank)</option>
              <option value="PH">PH (Pure Healer)</option>
              <option value="SH">SH (Shield Healer)</option>
              <option value="M1">M1 (Melee DPS 1)</option>
              <option value="M2">M2 (Melee DPS 2)</option>
              <option value="PR">PR (Phys Ranged)</option>
              <option value="C">C (Caster)</option>
            </select>
          </div>

          {/* Mínimo de Main Jobs */}
          <div>
            <select
              value={filters.minMainJobs}
              onChange={e => updateFilter('minMainJobs', Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition-all font-sans cursor-pointer"
            >
              <option value="0">Main Jobs: Cualquiera</option>
              <option value="8">8 / 8 Main Jobs (100% Mains)</option>
              <option value="7">7+ Main Jobs</option>
              <option value="6">6+ Main Jobs</option>
            </select>
          </div>
        </div>

        {/* Fila secundaria: Fase de Progreso y Criterio de Ordenación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 border-t border-white/5">
          {/* Fase de Progreso */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 shrink-0 font-medium">Fase:</span>
            <select
              value={filters.phase}
              onChange={e => updateFilter('phase', e.target.value as any)}
              className="w-full px-2.5 py-1 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition-all font-sans cursor-pointer"
            >
              <option value="ALL">Todas las Fases</option>
              <option value="garuda">Fase 1: Garuda (&lt; 100)</option>
              <option value="ifrit">Fase 2: Ifrit (100-199)</option>
              <option value="titan">Fase 3: Titan (200-299)</option>
              <option value="lahabrea">Fase 4: Lahabrea (300-399)</option>
              <option value="ultima">Fase 5: Ultima Weapon (400+)</option>
            </select>
          </div>

          {/* Ordenar Por */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 shrink-0 font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-cyan-400" />
              Orden:
            </span>
            <select
              value={filters.sortBy}
              onChange={e => updateFilter('sortBy', e.target.value as any)}
              className="w-full px-2.5 py-1 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 transition-all font-sans cursor-pointer"
            >
              <option value="default">Prioridad Oficial (Menor Score / Más Mains)</option>
              <option value="scoreAsc">Progreso Más Bajo Primero</option>
              <option value="scoreDesc">Progreso Más Alto Primero</option>
              <option value="mainJobsDesc">Mayor Cantidad de Main Jobs</option>
            </select>
          </div>

          {/* Selector de Tamaño de Página */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Mostrar por página:</span>
            <div className="inline-flex rounded-xl bg-slate-950/60 border border-white/10 p-0.5 text-[11px]">
              {[5, 10].map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => {
                    setPageSize(sz);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    pageSize === sz
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Resumen de Resultados */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="text-slate-400">
          Mostrando{' '}
          <strong className="text-white">
            {pagination.totalItems === 0 ? 0 : `${pagination.startIndex} - ${pagination.endIndex}`}
          </strong>{' '}
          de <strong className="text-cyan-300">{pagination.totalItems}</strong> combinaciones{' '}
          {isFilterActive && (
            <span className="text-slate-500 font-normal">
              (filtradas de un total de {combinations.length})
            </span>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="text-slate-400 text-[11px]">
            Página <strong className="text-white">{pagination.currentPage}</strong> de{' '}
            <strong className="text-white">{pagination.totalPages}</strong>
          </div>
        )}
      </div>

      {/* Lista de Combinaciones Paginadas */}
      {pagination.items.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-400/80 mx-auto" />
          <h4 className="text-sm font-bold text-slate-200">
            Ninguna combinación coincide con los filtros seleccionados
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Prueba ajustando el nombre del personaje, retirando el filtro de Job o disminuyendo el
            requisito de Main Jobs para ver otras alternativas.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-4 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Restablecer todos los filtros
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pagination.items.map(comb => {
            const isTopRank = comb.priorityRank === 1;
            const phaseLabel = getPhaseLabel(getPhaseFromScore(comb.avgProgressScore));
            const isCopied = copiedCombId === comb.id;

            return (
              <div
                key={comb.id}
                className={`p-4 rounded-2xl transition-all border ${
                  isTopRank
                    ? 'bg-gradient-to-r from-indigo-950/40 via-cyan-950/20 to-slate-900/60 border-amber-400/40 shadow-md'
                    : 'bg-slate-900/60 border-white/5 hover:border-white/15'
                }`}
              >
                {/* Encabezado de la Tarjeta de Party */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isTopRank ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[11px] font-bold flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-400" />
                        ★ Opción #1: Prioritaria / Recomendada
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 text-[11px] font-bold font-mono">
                        Opción #{comb.priorityRank}
                      </span>
                    )}

                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/20 font-medium">
                      {phaseLabel}
                    </span>

                    <span className="text-xs text-slate-300 font-mono">
                      Score: <strong className="text-cyan-300">{comb.avgProgressScore} / 500</strong>
                    </span>

                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        comb.mainJobsCount === 8
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : comb.mainJobsCount >= 6
                          ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {comb.mainJobsCount} / 8 Main Jobs
                    </span>
                  </div>

                  {/* Acciones de la Party */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyDiscord(comb)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all"
                      title="Copiar alineación para Discord"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300 text-[11px]">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-cyan-400" />
                          <span className="text-[11px]">Discord</span>
                        </>
                      )}
                    </button>

                    {session.type === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => onSchedule(comb)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                          isTopRank
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Oficializar opción
                      </button>
                    )}
                  </div>
                </div>

                {/* Grilla de los 8 Puestos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.values(comb.slots).map((slot, sIdx) => {
                    const isSearchMatch =
                      filters.search &&
                      slot.member.characterName
                        .toLowerCase()
                        .includes(filters.search.trim().toLowerCase());

                    const badgeStyle =
                      ROLE_BADGE_STYLES[slot.slotRole] || 'bg-slate-800 text-slate-300 border-white/10';

                    return (
                      <div
                        key={sIdx}
                        className={`p-2 rounded-xl border transition-all ${
                          isSearchMatch
                            ? 'bg-cyan-950/40 border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                            : 'bg-slate-950/50 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeStyle}`}
                          >
                            {slot.slotRole}
                          </span>
                          <span
                            className={`font-semibold truncate max-w-[110px] text-xs ${
                              isSearchMatch ? 'text-cyan-200 font-bold' : 'text-slate-200'
                            }`}
                            title={slot.member.characterName}
                          >
                            {slot.member.characterName}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                          <JobBadge jobId={slot.job} size="sm" isMain={slot.isMainJob} />
                          <span
                            className="text-[10px] font-mono text-slate-400"
                            title={`Progreso en este rol: ${slot.progressScore} / 500`}
                          >
                            {slot.progressScore} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Controles de Paginación */}
      {pagination.totalPages > 1 && (
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={!pagination.hasPrevPage}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          {/* Números de página con ventana inteligente */}
          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(pageNum => {
                if (pagination.totalPages <= 7) return true;
                if (pageNum === 1 || pageNum === pagination.totalPages) return true;
                return Math.abs(pageNum - pagination.currentPage) <= 1;
              })
              .map((pageNum, idx, arr) => {
                const prevNum = arr[idx - 1];
                const showEllipsisBefore = prevNum && pageNum - prevNum > 1;

                return (
                  <div key={pageNum} className="flex items-center gap-1">
                    {showEllipsisBefore && (
                      <span className="text-slate-500 px-1 text-xs">...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                        pagination.currentPage === pageNum
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
                      }`}
                    >
                      {pageNum}
                    </button>
                  </div>
                );
              })}
          </div>

          <button
            type="button"
            disabled={!pagination.hasNextPage}
            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  // Si está maximizado en modal a pantalla completa
  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="w-full max-w-6xl max-h-[92vh] flex flex-col glass-card rounded-3xl border border-cyan-500/30 shadow-2xl overflow-hidden">
          {/* Header del Modal */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Parties Viables — {dayName} {hourLabel}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-400/30">
                    {combinations.length} combinaciones
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Explorador de alineaciones completas 8/8 para este horario
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMaximized(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              title="Cerrar modal maximizado"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo con scroll */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">{content}</div>
        </div>
      </div>
    );
  }

  // Vista integrada normal (inline)
  return content;
}
