import { describe, it, expect } from 'vitest';
import {
  volunteerPartySchema,
  removeVolunteerSchema,
  promoteSlotSchema,
  closePromoteSlotSchema,
} from '../schemas';

describe('Volunteers and Recruitment Schemas', () => {
  it('validates a correct volunteer offering for a scheduled party', () => {
    const valid = {
      partyScheduleId: '123e4567-e89b-12d3-a456-426614174000',
      assignedJob: 'WAR',
      assignedRole: 'MT',
      availabilityNote: 'Disponible todo el horario',
    };

    const parsed = volunteerPartySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.assignedJob).toBe('WAR');
      expect(parsed.data.assignedRole).toBe('MT');
      expect(parsed.data.partyScheduleId).toBe('123e4567-e89b-12d3-a456-426614174000');
    }
  });

  it('validates a correct volunteer offering for an incomplete slot', () => {
    const valid = {
      slotKey: '1_21',
      assignedJob: 'WHM',
      assignedRole: 'PH',
      availabilityNote: 'Cubro Pure Healer sin problema',
    };

    const parsed = volunteerPartySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.slotKey).toBe('1_21');
    }
  });

  it('fails if neither partyScheduleId nor slotKey is provided', () => {
    const invalid = {
      assignedJob: 'WAR',
      assignedRole: 'MT',
    };

    const parsed = volunteerPartySchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates remove volunteer request', () => {
    const valid = { partyScheduleId: 'party-123' };
    expect(removeVolunteerSchema.safeParse(valid).success).toBe(true);

    const validSlot = { slotKey: '2_20' };
    expect(removeVolunteerSchema.safeParse(validSlot).success).toBe(true);

    const invalid = {};
    expect(removeVolunteerSchema.safeParse(invalid).success).toBe(false);
  });

  it('validates promote slot schema correctly', () => {
    const valid = {
      slotKey: '1_21',
      dayOfWeek: 1,
      hourSlot: 21,
      notes: '¡Falta 1 Shield Healer y 1 Caster!',
      missingSlots: ['SH', 'C'],
    };

    const parsed = promoteSlotSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.slotKey).toBe('1_21');
      expect(parsed.data.missingSlots).toEqual(['SH', 'C']);
    }
  });

  it('validates close promote slot schema', () => {
    const valid = { slotKey: '1_21' };
    expect(closePromoteSlotSchema.safeParse(valid).success).toBe(true);

    const invalid = { slotKey: '' };
    expect(closePromoteSlotSchema.safeParse(invalid).success).toBe(false);
  });
});
