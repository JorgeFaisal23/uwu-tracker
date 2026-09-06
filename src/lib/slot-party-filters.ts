import { JobId, PartyCombination, SlotRole } from '@/types';

export interface SlotPartyFilters {
  search: string;
  job: JobId | 'ALL';
  roleForSearch: SlotRole | 'ALL';
  minMainJobs: number;
  phase: 'ALL' | 'garuda' | 'ifrit' | 'titan' | 'lahabrea' | 'ultima';
  sortBy: 'default' | 'scoreAsc' | 'scoreDesc' | 'mainJobsDesc';
}

export const DEFAULT_SLOT_PARTY_FILTERS: SlotPartyFilters = {
  search: '',
  job: 'ALL',
  roleForSearch: 'ALL',
  minMainJobs: 0,
  phase: 'ALL',
  sortBy: 'default',
};

export function getPhaseFromScore(score: number): 'garuda' | 'ifrit' | 'titan' | 'lahabrea' | 'ultima' {
  if (score >= 400) return 'ultima';
  if (score >= 300) return 'lahabrea';
  if (score >= 200) return 'titan';
  if (score >= 100) return 'ifrit';
  return 'garuda';
}

export function getPhaseLabel(phase: 'garuda' | 'ifrit' | 'titan' | 'lahabrea' | 'ultima'): string {
  switch (phase) {
    case 'garuda': return 'Fase 1: Garuda';
    case 'ifrit': return 'Fase 2: Ifrit';
    case 'titan': return 'Fase 3: Titan';
    case 'lahabrea': return 'Fase 4: Lahabrea';
    case 'ultima': return 'Fase 5: Ultima Weapon';
  }
}

/**
 * Filtra y ordena las combinaciones de party según los criterios especificados.
 */
export function filterAndSortSlotParties(
  combinations: PartyCombination[],
  filters: SlotPartyFilters
): PartyCombination[] {
  const query = filters.search.trim().toLowerCase();

  const filtered = combinations.filter(comb => {
    const slotsList = Object.values(comb.slots);

    // 1. Filtro por búsqueda de personaje (y rol específico opcional)
    if (query) {
      if (filters.roleForSearch !== 'ALL') {
        const slot = slotsList.find(s => s.slotRole === filters.roleForSearch);
        if (!slot || !slot.member.characterName.toLowerCase().includes(query)) {
          return false;
        }
      } else {
        const hasMember = slotsList.some(s =>
          s.member.characterName.toLowerCase().includes(query)
        );
        if (!hasMember) return false;
      }
    } else if (filters.roleForSearch !== 'ALL' && filters.job !== 'ALL') {
      // Si hay rol especificado y job especificado sin búsqueda de texto
      const slot = slotsList.find(s => s.slotRole === filters.roleForSearch);
      if (!slot || slot.job !== filters.job) {
        return false;
      }
    }

    // 2. Filtro por Job
    if (filters.job !== 'ALL') {
      if (filters.roleForSearch !== 'ALL') {
        const slot = slotsList.find(s => s.slotRole === filters.roleForSearch);
        if (!slot || slot.job !== filters.job) return false;
      } else {
        const hasJob = slotsList.some(s => s.job === filters.job);
        if (!hasJob) return false;
      }
    }

    // 3. Filtro por Mínimo de Main Jobs
    if (filters.minMainJobs > 0 && comb.mainJobsCount < filters.minMainJobs) {
      return false;
    }

    // 4. Filtro por Fase de Progreso UWU
    if (filters.phase !== 'ALL') {
      const combPhase = getPhaseFromScore(comb.avgProgressScore);
      if (combPhase !== filters.phase) {
        return false;
      }
    }

    return true;
  });

  // Ordenación
  const sorted = [...filtered];
  switch (filters.sortBy) {
    case 'scoreAsc':
      sorted.sort((a, b) => a.avgProgressScore - b.avgProgressScore || b.mainJobsCount - a.mainJobsCount);
      break;
    case 'scoreDesc':
      sorted.sort((a, b) => b.avgProgressScore - a.avgProgressScore || b.mainJobsCount - a.mainJobsCount);
      break;
    case 'mainJobsDesc':
      sorted.sort((a, b) => b.mainJobsCount - a.mainJobsCount || a.avgProgressScore - b.avgProgressScore);
      break;
    case 'default':
    default:
      // Conservar el orden original del algoritmo (priorityRank)
      sorted.sort((a, b) => a.priorityRank - b.priorityRank);
      break;
  }

  return sorted;
}

export interface PaginationResult<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Aplica paginación a una lista de elementos.
 */
export function paginateList<T>(
  list: T[],
  page: number,
  pageSize: number
): PaginationResult<T> {
  const validPageSize = Math.max(1, pageSize);
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / validPageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));

  const startIndex = (currentPage - 1) * validPageSize;
  const endIndex = Math.min(startIndex + validPageSize, totalItems);
  const items = list.slice(startIndex, endIndex);

  return {
    items,
    currentPage,
    totalPages,
    totalItems,
    startIndex: totalItems === 0 ? 0 : startIndex + 1,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

/**
 * Formatea una combinación para Discord de manera concisa y clara.
 */
export function formatCombinationForDiscordText(
  comb: PartyCombination,
  dayName: string,
  hourLabel: string
): string {
  const roleOrder: Record<SlotRole, number> = {
    MT: 1,
    OT: 2,
    PH: 3,
    SH: 4,
    M1: 5,
    M2: 6,
    PR: 7,
    C: 8,
  };

  const slots = Object.values(comb.slots).sort(
    (a, b) => (roleOrder[a.slotRole] ?? 99) - (roleOrder[b.slotRole] ?? 99)
  );

  const tanks = slots.filter(s => s.slotRole === 'MT' || s.slotRole === 'OT');
  const healers = slots.filter(s => s.slotRole === 'PH' || s.slotRole === 'SH');
  const dps = slots.filter(s => ['M1', 'M2', 'PR', 'C'].includes(s.slotRole));

  const fmtSlot = (s: typeof slots[0]) =>
    `• **${s.slotRole}**: ${s.member.characterName} (${s.job})${s.isMainJob ? ' `[Main]`' : ''} - Progreso: ${s.progressScore}/500`;

  const header = [
    `⚔️ **Propuesta de Incursión UWU — Opción #${comb.priorityRank}**`,
    `📅 **Horario:** ${dayName} ${hourLabel}`,
    `📊 **Promedio Grupo:** ${comb.avgProgressScore}/500 | **Main Jobs:** ${comb.mainJobsCount}/8`,
  ].join('\n');

  return [
    header,
    `🛡️ **Tanques:**\n${tanks.map(fmtSlot).join('\n')}`,
    `💚 **Sanadores:**\n${healers.map(fmtSlot).join('\n')}`,
    `⚔️ **DPS:**\n${dps.map(fmtSlot).join('\n')}`,
  ].join('\n\n');
}
