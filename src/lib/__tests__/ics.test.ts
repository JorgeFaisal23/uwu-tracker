import { describe, expect, it } from 'vitest';
import { generatePartyIcs, escapeIcsText, foldIcsLine } from '../ics';
import { ScheduledParty } from '@/types';

describe('ICS Calendar Generator (RFC 5545)', () => {
  const mockParty: ScheduledParty = {
    id: 'test-party-123',
    scheduledDate: '2026-09-05',
    dayOfWeek: 5,
    hourSlot: 21,
    durationHours: 2,
    startTimeLabel: 'Viernes 21:00',
    status: 'ACCEPTED',
    notes: 'Llevar pots, comida HQ y estudiar fase de Titán.',
    createdAt: '2026-09-01T00:00:00.000Z',
    members: [
      {
        memberId: 'm1',
        characterName: 'Alphinaud Leveilleur',
        assignedJob: 'WAR',
        assignedRole: 'MT',
        isMainJob: true,
        confirmationStatus: 'CONFIRMED',
      },
      {
        memberId: 'm2',
        characterName: 'Alisaie Leveilleur',
        assignedJob: 'RDM',
        assignedRole: 'C',
        isMainJob: true,
        confirmationStatus: 'CONFIRMED',
      },
    ],
  };

  it('usa exclusivamente terminaciones de línea CRLF', () => {
    const ics = generatePartyIcs(mockParty);
    expect(ics).toContain('\r\n');
    // Cada línea debe terminar en \r\n
    const nonCrLf = ics.split('\r\n').some(line => line.includes('\n') || line.includes('\r'));
    expect(nonCrLf).toBe(false);
  });

  it('escapa caracteres especiales correctamente', () => {
    const raw = 'Notas: pots, comida; fase 3 \\ Ultima\nSegunda línea';
    const escaped = escapeIcsText(raw);
    expect(escaped).toBe('Notas: pots\\, comida\\; fase 3 \\\\ Ultima\\nSegunda línea');
  });

  it('pliega líneas que superan los 75 octetos', () => {
    const longText = 'DESCRIPTION:' + 'A'.repeat(100);
    const folded = foldIcsLine(longText);
    expect(folded).toContain('\r\n ');
    const lines = folded.split('\r\n');
    for (const l of lines) {
      expect(Buffer.byteLength(l, 'utf-8')).toBeLessThanOrEqual(75);
    }
  });

  it('incluye UID estable, DTSTART en UTC, VALARM y metadatos correctos', () => {
    const ics = generatePartyIcs(mockParty);
    expect(ics).toContain('UID:test-party-123@uwu-tracker');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT1H');
    expect(ics).toContain('SUMMARY:The Weapon\'s Refrain (UWU) - Lux Obscura');
    expect(ics).toContain('DTSTART:');
    expect(ics).toContain('DTEND:');
    expect(ics).toContain('END:VCALENDAR');
  });
});
