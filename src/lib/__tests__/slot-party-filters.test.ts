import { describe, it, expect } from 'vitest';
import {
  filterAndSortSlotParties,
  paginateList,
  getPhaseFromScore,
  DEFAULT_SLOT_PARTY_FILTERS,
  SlotPartyFilters,
} from '../slot-party-filters';
import { PartyCombination, Member } from '@/types';

function createMockMember(id: string, name: string): Member {
  return {
    id,
    characterName: name,
    passwordHash: 'hash',
    mainJob: 'WAR',
    flexJobs: [],
    tankStance: 'MT',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isActive: true,
  };
}

function createMockCombination(
  id: string,
  priorityRank: number,
  avgProgressScore: number,
  mainJobsCount: number,
  members: { name: string; job: string; role: any; isMain: boolean; score: number }[]
): PartyCombination {
  const roles = ['mt', 'ot', 'ph', 'sh', 'm1', 'm2', 'pr', 'c'] as const;
  const slots: any = {};

  roles.forEach((r, idx) => {
    const m = members[idx] || {
      name: `Player_${idx}`,
      job: 'WAR',
      role: r.toUpperCase(),
      isMain: true,
      score: 100,
    };
    slots[r] = {
      member: createMockMember(`m_${m.name}`, m.name),
      job: m.job,
      isMainJob: m.isMain,
      subrole: 'TANK',
      slotRole: m.role,
      progressScore: m.score,
    };
  });

  return {
    id,
    dayOfWeek: 1,
    hourSlot: 21,
    slots,
    totalProgressScore: avgProgressScore * 8,
    mainJobsCount,
    avgProgressScore,
    priorityRank,
  };
}

describe('slot-party-filters', () => {
  const mockParty1 = createMockCombination('p1', 1, 150, 8, [
    { name: 'Xenon Alpha', job: 'WAR', role: 'MT', isMain: true, score: 120 },
    { name: 'Jorge Tank', job: 'PLD', role: 'OT', isMain: true, score: 150 },
    { name: 'Healer One', job: 'WHM', role: 'PH', isMain: true, score: 180 },
    { name: 'Healer Two', job: 'SCH', role: 'SH', isMain: true, score: 160 },
    { name: 'Melee One', job: 'SAM', role: 'M1', isMain: true, score: 140 },
    { name: 'Melee Two', job: 'NIN', role: 'M2', isMain: true, score: 130 },
    { name: 'Ranged One', job: 'DNC', role: 'PR', isMain: true, score: 150 },
    { name: 'Caster One', job: 'BLM', role: 'C', isMain: true, score: 170 },
  ]);

  const mockParty2 = createMockCombination('p2', 2, 280, 6, [
    { name: 'Bob Tank', job: 'GNB', role: 'MT', isMain: false, score: 250 },
    { name: 'Jorge Tank', job: 'DRK', role: 'OT', isMain: true, score: 290 },
    { name: 'Healer Three', job: 'AST', role: 'PH', isMain: true, score: 300 },
    { name: 'Healer Four', job: 'SGE', role: 'SH', isMain: false, score: 260 },
    { name: 'Melee Three', job: 'MNK', role: 'M1', isMain: true, score: 270 },
    { name: 'Melee Four', job: 'RPR', role: 'M2', isMain: true, score: 280 },
    { name: 'Ranged Two', job: 'BRD', role: 'PR', isMain: true, score: 290 },
    { name: 'Caster Two', job: 'RDM', role: 'C', isMain: true, score: 300 },
  ]);

  const mockParty3 = createMockCombination('p3', 3, 420, 7, [
    { name: 'Veteran Tank', job: 'WAR', role: 'MT', isMain: true, score: 450 },
    { name: 'Veteran OT', job: 'PLD', role: 'OT', isMain: true, score: 430 },
    { name: 'Veteran PH', job: 'WHM', role: 'PH', isMain: true, score: 400 },
    { name: 'Veteran SH', job: 'SCH', role: 'SH', isMain: true, score: 420 },
    { name: 'Veteran M1', job: 'DRG', role: 'M1', isMain: false, score: 390 },
    { name: 'Veteran M2', job: 'VPR', role: 'M2', isMain: true, score: 410 },
    { name: 'Ranged Three', job: 'MCH', role: 'PR', isMain: true, score: 430 },
    { name: 'Xenon Alpha', job: 'SMN', role: 'C', isMain: true, score: 430 },
  ]);

  const allParties = [mockParty1, mockParty2, mockParty3];

  it('filters by member name case-insensitively', () => {
    const result = filterAndSortSlotParties(allParties, {
      ...DEFAULT_SLOT_PARTY_FILTERS,
      search: 'xenon',
    });
    expect(result).toHaveLength(2);
    expect(result.map(p => p.id)).toEqual(['p1', 'p3']);
  });

  it('filters by member name and specific role', () => {
    const result = filterAndSortSlotParties(allParties, {
      ...DEFAULT_SLOT_PARTY_FILTERS,
      search: 'xenon',
      roleForSearch: 'C',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p3');
  });

  it('filters by job presence', () => {
    const result = filterAndSortSlotParties(allParties, {
      ...DEFAULT_SLOT_PARTY_FILTERS,
      job: 'GNB',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p2');
  });

  it('filters by minimum main jobs count', () => {
    const result = filterAndSortSlotParties(allParties, {
      ...DEFAULT_SLOT_PARTY_FILTERS,
      minMainJobs: 8,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('filters by progress phase', () => {
    const titanResults = filterAndSortSlotParties(allParties, {
      ...DEFAULT_SLOT_PARTY_FILTERS,
      phase: 'titan',
    });
    expect(titanResults).toHaveLength(1);
    expect(titanResults[0].id).toBe('p2');

    const ultimaResults = filterAndSortSlotParties(allParties, {
      ...DEFAULT_SLOT_PARTY_FILTERS,
      phase: 'ultima',
    });
    expect(ultimaResults).toHaveLength(1);
    expect(ultimaResults[0].id).toBe('p3');
  });

  it('sorts parties by score ascending and descending', () => {
    const asc = filterAndSortSlotParties(allParties, {
      ...DEFAULT_SLOT_PARTY_FILTERS,
      sortBy: 'scoreAsc',
    });
    expect(asc.map(p => p.id)).toEqual(['p1', 'p2', 'p3']);

    const desc = filterAndSortSlotParties(allParties, {
      ...DEFAULT_SLOT_PARTY_FILTERS,
      sortBy: 'scoreDesc',
    });
    expect(desc.map(p => p.id)).toEqual(['p3', 'p2', 'p1']);
  });

  describe('paginateList', () => {
    const sampleItems = Array.from({ length: 23 }, (_, i) => `item_${i + 1}`);

    it('paginates correctly on first page', () => {
      const page1 = paginateList(sampleItems, 1, 5);
      expect(page1.items).toHaveLength(5);
      expect(page1.items[0]).toBe('item_1');
      expect(page1.items[4]).toBe('item_5');
      expect(page1.currentPage).toBe(1);
      expect(page1.totalPages).toBe(5);
      expect(page1.totalItems).toBe(23);
      expect(page1.startIndex).toBe(1);
      expect(page1.endIndex).toBe(5);
      expect(page1.hasPrevPage).toBe(false);
      expect(page1.hasNextPage).toBe(true);
    });

    it('paginates correctly on last page', () => {
      const page5 = paginateList(sampleItems, 5, 5);
      expect(page5.items).toHaveLength(3);
      expect(page5.items[0]).toBe('item_21');
      expect(page5.items[2]).toBe('item_23');
      expect(page5.currentPage).toBe(5);
      expect(page5.totalPages).toBe(5);
      expect(page5.startIndex).toBe(21);
      expect(page5.endIndex).toBe(23);
      expect(page5.hasPrevPage).toBe(true);
      expect(page5.hasNextPage).toBe(false);
    });

    it('handles out of bounds page numbers gracefully', () => {
      const negative = paginateList(sampleItems, -3, 5);
      expect(negative.currentPage).toBe(1);

      const beyond = paginateList(sampleItems, 99, 5);
      expect(beyond.currentPage).toBe(5);
    });

    it('handles empty list gracefully', () => {
      const empty = paginateList([], 1, 5);
      expect(empty.items).toHaveLength(0);
      expect(empty.totalPages).toBe(1);
      expect(empty.totalItems).toBe(0);
      expect(empty.startIndex).toBe(0);
      expect(empty.endIndex).toBe(0);
    });
  });

  describe('getPhaseFromScore', () => {
    it('determines phases correctly', () => {
      expect(getPhaseFromScore(50)).toBe('garuda');
      expect(getPhaseFromScore(150)).toBe('ifrit');
      expect(getPhaseFromScore(250)).toBe('titan');
      expect(getPhaseFromScore(350)).toBe('lahabrea');
      expect(getPhaseFromScore(450)).toBe('ultima');
    });
  });
});
