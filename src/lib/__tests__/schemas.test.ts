import { describe, expect, it } from 'vitest';
import {
  characterNameSchema,
  ffxivCharacterNameSchema,
  memberProfileUpdateSchema,
  memberRegisterSchema,
} from '../schemas';

describe('ffxivCharacterNameSchema', () => {
  it('acepta nombres con el formato de FFXIV', () => {
    const validos = [
      'Aria Thorne',
      "Y'shtola Rhul", // apóstrofo, propio de los nombres miqo'te
      'Jean-Luc Aubert', // guion
      'Ñuño Ibáñez', // acentos y eñe
      'Ab Cd', // el mínimo: dos caracteres por parte
    ];

    for (const nombre of validos) {
      expect(ffxivCharacterNameSchema.safeParse(nombre).success, nombre).toBe(true);
    }
  });

  /**
   * Nombres tomados del roster real de la FC. La primera versión de esta regla exigía
   * "Nombre Apellido" y habría dejado fuera a "Eros" y "Kami", que son miembros con
   * progreso y disponibilidad registrados.
   */
  it('acepta los nombres reales del roster, incluidos los de una sola palabra', () => {
    const roster = [
      'Eulenlieder Falke',
      'Nikora Yian',
      'Hunter Lion',
      'Sora Mint',
      'Izaro Filarette',
      'Sadina Akiyama',
      'Valstrax Soulseer',
      'Sir Datts',
      'Darken Vadira',
      'Kaeia Hasenlied',
      'Eros', // una sola palabra
      'Kami', // una sola palabra
      'Ice-cream Frosting', // guion dentro de la primera parte
    ];

    for (const nombre of roster) {
      expect(ffxivCharacterNameSchema.safeParse(nombre).success, nombre).toBe(true);
    }
  });

  /**
   * Los nombres reales del alta masiva del 5 de septiembre de 2026. Antes pasaban porque
   * lo único que se comprobaba era la longitud.
   */
  it('rechaza los nombres del registro masivo automatizado', () => {
    const spam = [
      '05Nz1eA75B164Ekf YmzZGkL4ZFPX5NRe',
      '08FGnxdBM3wccBmX v3KgSsrTS7EHg0yH',
      '0qg9t1QiSFj6fuYH KZbdfIKyjbBEt3tk',
      '13DXMwFo2KWgZo4l 21lWaIK6QrSiwAFd',
      '1gohxHoSkJgotN3l R35tV7g2UDgQOYyE',
      '@\'\'#¨Íýlý',
    ];

    for (const nombre of spam) {
      expect(ffxivCharacterNameSchema.safeParse(nombre).success, nombre).toBe(false);
    }
  });

  it('admite hasta tres palabras y rechaza a partir de la cuarta', () => {
    expect(ffxivCharacterNameSchema.safeParse('Aria').success).toBe(true);
    expect(ffxivCharacterNameSchema.safeParse('Aria Thorne Segunda').success).toBe(true);
    expect(ffxivCharacterNameSchema.safeParse('Aria Thorne Segunda Tercera').success).toBe(false);
  });

  it('rechaza dígitos y símbolos, que FFXIV no permite en un nombre', () => {
    expect(ffxivCharacterNameSchema.safeParse('Aria Th0rne').success).toBe(false);
    expect(ffxivCharacterNameSchema.safeParse('Aria <script>').success).toBe(false);
  });

  it('rechaza partes más largas de 15 caracteres', () => {
    expect(ffxivCharacterNameSchema.safeParse('Aria Abcdefghijklmnop').success).toBe(false);
  });

  it('no endurece el login: characterNameSchema sigue aceptando nombres libres', () => {
    // Si el login exigiera el mismo formato, cualquier miembro legítimo ya registrado
    // con un nombre fuera de patrón quedaría fuera de su propia cuenta.
    expect(characterNameSchema.safeParse('Aria').success).toBe(true);
  });
});

describe('memberRegisterSchema', () => {
  const base = {
    action: 'register' as const,
    characterName: 'Aria Thorne',
    password: 'contraseña-larga',
    inviteCode: 'un-codigo-cualquiera',
    mainJob: 'WAR' as const,
  };

  it('acepta un alta completa', () => {
    expect(memberRegisterSchema.safeParse(base).success).toBe(true);
  });

  /**
   * La huella que delató el alta masiva: filas con el main job dentro de sus propios
   * flex jobs. La interfaz nunca pudo producirlas; el servidor sí las aceptaba.
   */
  it('rechaza el main job repetido como flex job', () => {
    const resultado = memberRegisterSchema.safeParse({
      ...base,
      mainJob: 'SCH',
      flexJobs: ['SCH', 'DRK'],
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(['flexJobs']);
  });

  it('rechaza flex jobs repetidos', () => {
    expect(
      memberRegisterSchema.safeParse({ ...base, flexJobs: ['DRK', 'DRK'] }).success
    ).toBe(false);
  });

  it('acepta flex jobs distintos del main job', () => {
    expect(
      memberRegisterSchema.safeParse({ ...base, mainJob: 'SCH', flexJobs: ['SGE', 'DRK'] })
        .success
    ).toBe(true);
  });

  it('exige el código de invitación', () => {
    const sinCodigo: Record<string, unknown> = { ...base };
    delete sinCodigo.inviteCode;

    expect(memberRegisterSchema.safeParse(sinCodigo).success).toBe(false);
    expect(memberRegisterSchema.safeParse({ ...base, inviteCode: '   ' }).success).toBe(false);
  });
});

describe('memberProfileUpdateSchema', () => {
  it('rechaza el main job repetido como flex job', () => {
    expect(
      memberProfileUpdateSchema.safeParse({ mainJob: 'SCH', flexJobs: ['SCH', 'DRK'] }).success
    ).toBe(false);
  });

  it('deja pasar los flex jobs sueltos: esa comprobación necesita el main job guardado', () => {
    // Sin main job en la petición el esquema no puede decidir. La invariante la aplica
    // `StorageService.updateMemberProfile`, que sí lee el valor actual del miembro.
    expect(memberProfileUpdateSchema.safeParse({ flexJobs: ['SCH', 'DRK'] }).success).toBe(true);
  });
});
