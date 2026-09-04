import { describe, expect, it } from 'vitest';
import {
  formatDateToSpanish,
  getConfirmationDeadline,
  getCurrentWeekDates,
  getNextDateForDayOfWeek,
  getPartyEndDateTime,
  getPartyStartDateTime,
  getRelativeDateLabel,
  getRemainingConfirmationInfo,
  isConfirmationWindowOpen,
  isPartyExpired,
} from '../date-utils';
import {
  getCalendarWeek,
  getCalendarWeekRange,
  formatCalendarWeekRange,
  getFfxivWeek,
  shiftSlotToZone,
} from '../guild-time';
import {
  computeGridPositionRange,
  RAID_HOURS,
  FULL_HOURS_START_17,
  DAYS_OF_WEEK,
} from '../timezones';

/**
 * Estas pruebas no fijan la zona del proceso a propósito: todos los resultados deben
 * salir de la zona de la FC, no de `TZ`. Si alguna dependiera de la hora local, fallaría
 * al ejecutarse con `TZ=UTC` (que es como corre Vercel) — ver el script `test:utc`.
 */

// Viernes 4 de septiembre de 2026, 21:00 en CDMX (UTC-6 en horario de verano).
const FRIDAY = '2026-09-04';

describe('getPartyStartDateTime', () => {
  it('interpreta la hora en la zona de la FC, no en la del proceso', () => {
    const start = getPartyStartDateTime(FRIDAY, 21);

    // 21:00 CDMX en septiembre (UTC-6) = 03:00 UTC del día siguiente.
    expect(start.toISOString()).toBe('2026-09-05T03:00:00.000Z');
  });

  it('mantiene la hora de la FC a través del cambio de horario', () => {
    // En enero México está en UTC-6 igualmente (ya no aplica horario de verano
    // desde 2022), así que 21:00 debe seguir siendo 03:00 UTC.
    const winter = getPartyStartDateTime('2026-01-16', 21);
    expect(winter.toISOString()).toBe('2026-01-17T03:00:00.000Z');

    const summer = getPartyStartDateTime('2026-07-17', 21);
    expect(summer.toISOString()).toBe('2026-07-18T03:00:00.000Z');
  });

  it('la duración se suma sobre el instante real', () => {
    const end = getPartyEndDateTime(FRIDAY, 21, 2);
    expect(end.toISOString()).toBe('2026-09-05T05:00:00.000Z');
  });
});

describe('isConfirmationWindowOpen', () => {
  const party = { date: FRIDAY, hour: 21 };

  it('la ventana cierra exactamente 5 horas antes del inicio', () => {
    const deadline = getConfirmationDeadline(party.date, party.hour, 5);
    expect(deadline.toISOString()).toBe('2026-09-04T22:00:00.000Z'); // 16:00 CDMX

    const unMinutoAntes = new Date(deadline.getTime() - 60_000);
    const unMinutoDespues = new Date(deadline.getTime() + 60_000);

    expect(isConfirmationWindowOpen(party.date, party.hour, 5, unMinutoAntes)).toBe(true);
    expect(isConfirmationWindowOpen(party.date, party.hour, 5, deadline)).toBe(false);
    expect(isConfirmationWindowOpen(party.date, party.hour, 5, unMinutoDespues)).toBe(false);
  });

  it('informa del tiempo restante en horas y minutos', () => {
    // 2h30 antes del cierre.
    const now = new Date('2026-09-04T19:30:00.000Z');
    const info = getRemainingConfirmationInfo(party.date, party.hour, 5, now);

    expect(info.isOpen).toBe(true);
    expect(info.hoursRemaining).toBe(2);
    expect(info.minutesRemaining).toBe(30);
  });

  it('no devuelve tiempos negativos una vez cerrada', () => {
    const info = getRemainingConfirmationInfo(
      party.date,
      party.hour,
      5,
      new Date('2026-09-05T10:00:00.000Z')
    );

    expect(info.isOpen).toBe(false);
    expect(info.hoursRemaining).toBe(0);
    expect(info.minutesRemaining).toBe(0);
  });
});

describe('isPartyExpired', () => {
  const party = {
    scheduledDate: FRIDAY,
    dayOfWeek: 5,
    hourSlot: 21,
    durationHours: 2,
    status: 'ACCEPTED',
  };

  it('sigue vigente mientras la incursión está en curso', () => {
    // 22:00 CDMX, con la party corriendo de 21:00 a 23:00.
    expect(isPartyExpired(party, new Date('2026-09-05T04:00:00.000Z'))).toBe(false);
  });

  it('expira al terminar la duración, no al cambiar el día', () => {
    // 23:00 CDMX en punto: se acabó.
    expect(isPartyExpired(party, new Date('2026-09-05T05:00:00.000Z'))).toBe(true);
    // Un minuto antes, no.
    expect(isPartyExpired(party, new Date('2026-09-05T04:59:00.000Z'))).toBe(false);
  });

  it('una party de la madrugada CDMX no se da por vencida antes de tiempo', () => {
    // Este es el caso que rompía la versión anterior: a las 01:00 CDMX del sábado,
    // en UTC ya es sábado por la tarde, y comparar fechas en marcos distintos
    // marcaba la party como expirada.
    const madrugada = { ...party, scheduledDate: '2026-09-05', hourSlot: 1, durationHours: 2 };
    // 01:30 CDMX del sábado = 07:30 UTC.
    expect(isPartyExpired(madrugada, new Date('2026-09-05T07:30:00.000Z'))).toBe(false);
  });

  it('los estados terminales expiran siempre', () => {
    for (const status of ['CANCELLED', 'COMPLETED', 'EXPIRED']) {
      expect(isPartyExpired({ ...party, status }, new Date('2020-01-01T00:00:00Z'))).toBe(true);
    }
  });

  it('sin fecha agendada no se considera expirada', () => {
    const legacy = { dayOfWeek: 5, hourSlot: 21, status: 'ACCEPTED' };
    expect(isPartyExpired(legacy, new Date())).toBe(false);
  });
});

describe('getNextDateForDayOfWeek', () => {
  it('salta a la semana siguiente si hoy ya pasó la hora', () => {
    // Viernes 4 de septiembre, 22:00 CDMX (04:00 UTC del día 5).
    const viernesNoche = new Date('2026-09-05T04:00:00.000Z');

    // Para una franja de las 21:00 el viernes, la próxima es el 11.
    expect(getNextDateForDayOfWeek(5, 21, viernesNoche)).toBe('2026-09-11');
    // Para una franja de las 23:00 ese mismo viernes, todavía es hoy.
    expect(getNextDateForDayOfWeek(5, 23, viernesNoche)).toBe('2026-09-04');
  });

  it('encuentra el próximo día de la semana', () => {
    const viernes = new Date('2026-09-04T18:00:00.000Z'); // 12:00 CDMX
    expect(getNextDateForDayOfWeek(6, undefined, viernes)).toBe('2026-09-05'); // sábado
    expect(getNextDateForDayOfWeek(0, undefined, viernes)).toBe('2026-09-06'); // domingo
    expect(getNextDateForDayOfWeek(4, undefined, viernes)).toBe('2026-09-10'); // jueves
  });
});

describe('getCurrentWeekDates', () => {
  it('devuelve los 7 días desde el domingo', () => {
    const week = getCurrentWeekDates(new Date('2026-09-04T18:00:00.000Z'));

    expect(week).toHaveLength(7);
    expect(week[0].dayOfWeek).toBe(0);
    expect(week[0].dateStr).toBe('2026-08-30'); // domingo anterior
    expect(week[5].dateStr).toBe('2026-09-04'); // viernes
    expect(week[6].dateStr).toBe('2026-09-05'); // sábado
  });
});

describe('formatDateToSpanish', () => {
  it('no desplaza el día por la zona del proceso', () => {
    expect(formatDateToSpanish('2026-09-04')).toContain('4');
    expect(formatDateToSpanish('2026-09-04')).toContain('2026');
    expect(formatDateToSpanish('2026-01-01', true)).toContain('1');
  });
});

describe('getRelativeDateLabel', () => {
  it('describe la distancia en días', () => {
    expect(getRelativeDateLabel('2026-09-04', '2026-09-04')).toBe('¡Hoy!');
    expect(getRelativeDateLabel('2026-09-05', '2026-09-04')).toBe('Mañana');
    expect(getRelativeDateLabel('2026-09-07', '2026-09-04')).toBe('En 3 días');
    expect(getRelativeDateLabel('2026-09-03', '2026-09-04')).toBe('Ayer');
    expect(getRelativeDateLabel('2026-09-01', '2026-09-04')).toBe('Hace 3 días');
  });

  it('cruza el cambio de mes correctamente', () => {
    expect(getRelativeDateLabel('2026-10-01', '2026-09-30')).toBe('Mañana');
    expect(getRelativeDateLabel('2026-09-30', '2026-10-01')).toBe('Ayer');
  });
});

describe('getCalendarWeek y semanas del calendario', () => {
  it('agrupa por la semana del calendario civil (lunes a domingo)', () => {
    // Semana 36 de 2026: del lunes 31 de agosto al domingo 6 de septiembre de 2026
    const lunes = getCalendarWeek(new Date('2026-08-31T18:00:00.000Z'));
    const martes = getCalendarWeek(new Date('2026-09-01T18:00:00.000Z'));
    const jueves = getCalendarWeek(new Date('2026-09-03T18:00:00.000Z'));
    const domingo = getCalendarWeek(new Date('2026-09-06T18:00:00.000Z'));

    expect(martes).toEqual(lunes);
    expect(jueves).toEqual(lunes);
    expect(domingo).toEqual(lunes);
    expect(lunes.weekNumber).toBe(36);
    expect(lunes.year).toBe(2026);
    expect(lunes.weekStartDate).toBe('2026-08-31');
    expect(lunes.weekEndDate).toBe('2026-09-06');
    expect(lunes.formattedRange).toBe('31 ago - 6 sep 2026');
  });

  it('el lunes siguiente abre una nueva semana del calendario civil', () => {
    const domingo = getCalendarWeek(new Date('2026-09-06T18:00:00.000Z'));
    const lunesSiguiente = getCalendarWeek(new Date('2026-09-07T18:00:00.000Z'));

    expect(lunesSiguiente.weekStartDate).toBe('2026-09-07');
    expect(lunesSiguiente.weekEndDate).toBe('2026-09-13');
    expect(lunesSiguiente.weekNumber).toBe(domingo.weekNumber + 1);
    expect(lunesSiguiente.weekNumber).toBe(37);
  });

  it('es estable: el mismo instante da siempre la misma semana', () => {
    const instant = new Date('2026-09-03T18:00:00.000Z');
    expect(getCalendarWeek(instant)).toEqual(getCalendarWeek(instant));
    expect(getFfxivWeek(instant)).toEqual(getCalendarWeek(instant));
  });

  it('calcula correctamente el rango de cualquier semana con getCalendarWeekRange', () => {
    const range36 = getCalendarWeekRange(2026, 36);
    expect(range36.weekStartDate).toBe('2026-08-31');
    expect(range36.weekEndDate).toBe('2026-09-06');
    expect(range36.formattedRange).toBe('31 ago - 6 sep 2026');

    const range37 = getCalendarWeekRange(2026, 37);
    expect(range37.weekStartDate).toBe('2026-09-07');
    expect(range37.weekEndDate).toBe('2026-09-13');
    expect(range37.formattedRange).toBe('7 - 13 sep 2026');
  });

  it('formatea correctamente rangos con formatCalendarWeekRange', () => {
    expect(formatCalendarWeekRange('2026-08-31', '2026-09-06')).toBe('31 ago - 6 sep 2026');
    expect(formatCalendarWeekRange('2026-09-07', '2026-09-13')).toBe('7 - 13 sep 2026');
    expect(formatCalendarWeekRange('2026-12-28', '2027-01-03')).toBe('28 dic 2026 - 3 ene 2027');
  });
});

describe('shiftSlotToZone', () => {
  it('deja la franja intacta en la zona de la FC', () => {
    expect(shiftSlotToZone(5, 21, 'America/Mexico_City')).toEqual({
      dayOfWeek: 5,
      hourSlot: 21,
      dayShift: 0,
    });
  });

  it('convierte a otra zona cruzando la medianoche', () => {
    // Viernes 21:00 CDMX = sábado 05:00 en Madrid (CEST, UTC+2).
    const madrid = shiftSlotToZone(5, 21, 'Europe/Madrid', new Date('2026-09-01T12:00:00Z'));
    expect(madrid.dayOfWeek).toBe(6);
    expect(madrid.hourSlot).toBe(5);

    // Y a UTC (server time de FFXIV): sábado 03:00.
    const utc = shiftSlotToZone(5, 21, 'UTC', new Date('2026-09-01T12:00:00Z'));
    expect(utc.dayOfWeek).toBe(6);
    expect(utc.hourSlot).toBe(3);
  });
});

describe('Horas del calendario y computeGridPositionRange', () => {
  it('RAID_HOURS empieza a las 17 horas y cubre hasta las 23', () => {
    expect(RAID_HOURS[0]).toBe(17);
    expect(RAID_HOURS).toEqual([17, 18, 19, 20, 21, 22, 23]);
  });

  it('FULL_HOURS_START_17 cubre las 24 horas iniciando a las 17', () => {
    expect(FULL_HOURS_START_17.length).toBe(24);
    expect(FULL_HOURS_START_17[0]).toBe(17);
    expect(FULL_HOURS_START_17[FULL_HOURS_START_17.length - 1]).toBe(16);
  });

  it('selecciona rango espacial 2D (posición, no tiempo cronológico)', () => {
    // De Lunes (id 1) 18:00 a Miércoles (id 3) 20:00 en horario raid
    const range = computeGridPositionRange(
      { day: 1, hour: 18 },
      { day: 3, hour: 20 },
      RAID_HOURS,
      DAYS_OF_WEEK
    );

    // Debe contener exactamente los 3 días x 3 horas = 9 casillas
    expect(range.length).toBe(9);

    // Contiene las horas 18, 19, 20 para los días 1 (Lun), 2 (Mar), 3 (Mié)
    for (const d of [1, 2, 3]) {
      for (const h of [18, 19, 20]) {
        expect(range).toContainEqual({ day: d, hour: h });
      }
    }

    // NO contiene horas fuera del rectángulo como 17 o 21, ni días como 0 (Dom) o 4 (Jue)
    expect(range).not.toContainEqual({ day: 1, hour: 17 });
    expect(range).not.toContainEqual({ day: 2, hour: 21 });
    expect(range).not.toContainEqual({ day: 0, hour: 19 });
    expect(range).not.toContainEqual({ day: 4, hour: 19 });
  });

  it('funciona en orden inverso (de abajo hacia arriba y derecha a izquierda)', () => {
    const rangeNormal = computeGridPositionRange(
      { day: 1, hour: 18 },
      { day: 3, hour: 20 },
      RAID_HOURS,
      DAYS_OF_WEEK
    );
    const rangeInverted = computeGridPositionRange(
      { day: 3, hour: 20 },
      { day: 1, hour: 18 },
      RAID_HOURS,
      DAYS_OF_WEEK
    );

    expect(rangeInverted.length).toBe(rangeNormal.length);
    expect(new Set(rangeInverted.map(s => `${s.day}_${s.hour}`))).toEqual(
      new Set(rangeNormal.map(s => `${s.day}_${s.hour}`))
    );
  });

  it('una sola casilla da rango de tamaño 1', () => {
    const range = computeGridPositionRange(
      { day: 2, hour: 19 },
      { day: 2, hour: 19 },
      RAID_HOURS,
      DAYS_OF_WEEK
    );
    expect(range).toEqual([{ day: 2, hour: 19 }]);
  });
});

