import { describe, expect, it } from 'vitest';
import { formatPartyForDiscord } from '../format-party';
import { ScheduledParty } from '@/types';

describe('formatPartyForDiscord', () => {
  const party: ScheduledParty = {
    id: 'p-1',
    scheduledDate: '2026-09-05',
    dayOfWeek: 5,
    hourSlot: 21,
    durationHours: 2,
    startTimeLabel: 'Viernes 21:00',
    status: 'ACCEPTED',
    notes: 'Puntualidad en Discord',
    createdAt: '2026-09-01T00:00:00.000Z',
    members: [
      { memberId: '1', characterName: 'Player MT', assignedJob: 'WAR', assignedRole: 'MT', isMainJob: true, confirmationStatus: 'CONFIRMED' },
      { memberId: '2', characterName: 'Player OT', assignedJob: 'GNB', assignedRole: 'OT', isMainJob: false, confirmationStatus: 'CONFIRMED' },
      { memberId: '3', characterName: 'Player PH', assignedJob: 'WHM', assignedRole: 'PH', isMainJob: true, confirmationStatus: 'CONFIRMED' },
      { memberId: '4', characterName: 'Player SH', assignedJob: 'SCH', assignedRole: 'SH', isMainJob: true, confirmationStatus: 'CONFIRMED' },
      { memberId: '5', characterName: 'Player M1', assignedJob: 'SAM', assignedRole: 'M1', isMainJob: true, confirmationStatus: 'CONFIRMED' },
      { memberId: '6', characterName: 'Player M2', assignedJob: 'NIN', assignedRole: 'M2', isMainJob: false, confirmationStatus: 'CONFIRMED' },
      { memberId: '7', characterName: 'Player PR', assignedJob: 'DNC', assignedRole: 'PR', isMainJob: true, confirmationStatus: 'CONFIRMED' },
      { memberId: '8', characterName: 'Player C', assignedJob: 'BLM', assignedRole: 'C', isMainJob: true, confirmationStatus: 'CONFIRMED' },
    ],
  };

  it('formatea la party para Discord con roles, jobs y fecha legible', () => {
    const text = formatPartyForDiscord(party);
    expect(text).toContain('Incursión Oficial UWU — Lux Obscura');
    expect(text).toContain('21:00 CDMX');
    expect(text).toContain('**Notas:** Puntualidad en Discord');
    expect(text).toContain('Player MT (WAR) `[Main]`');
    expect(text).toContain('Player OT (GNB)');
    expect(text).not.toContain('Player OT (GNB) `[Main]`');
    expect(text).toContain('🛡️ **Tanques:**');
    expect(text).toContain('💚 **Sanadores:**');
    expect(text).toContain('⚔️ **DPS:**');
  });

  it('incluye mención del rol si se especifica en options', () => {
    const text = formatPartyForDiscord(party, { roleMention: '<@&987654321>' });
    expect(text.startsWith('<@&987654321>')).toBe(true);
  });
});
