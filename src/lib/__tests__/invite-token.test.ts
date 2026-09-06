import { describe, expect, it } from 'vitest';
import { generateInviteToken, hashInviteToken, normalizeInviteToken } from '../auth';

describe('generateInviteToken', () => {
  it('produce el formato XXXXX-XXXXX-XXXXX-XXXXX', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateInviteToken()).toMatch(/^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/);
    }
  });

  it('no usa caracteres que se confundan al leerlos', () => {
    // I/L/O se confunden con 1/0 en la mayoría de tipografías, y el token se comparte
    // por Discord y a veces se teclea a mano.
    const muestra = Array.from({ length: 200 }, generateInviteToken).join('');
    expect(muestra).not.toMatch(/[ILO01]/);
  });

  it('no repite tokens', () => {
    const generados = new Set(Array.from({ length: 500 }, generateInviteToken));
    expect(generados.size).toBe(500);
  });

  it('reparte los símbolos sin sesgo apreciable', () => {
    // Un `byte % 31` sin descartar el resto favorecería las primeras letras del alfabeto.
    // Con 31 símbolos y 40.000 caracteres, lo esperado son ~1290 por símbolo.
    const conteo = new Map<string, number>();
    for (let i = 0; i < 2000; i++) {
      for (const c of generateInviteToken().replace(/-/g, '')) {
        conteo.set(c, (conteo.get(c) ?? 0) + 1);
      }
    }

    expect(conteo.size).toBe(31);
    const valores = [...conteo.values()];
    expect(Math.min(...valores)).toBeGreaterThan(1000);
    expect(Math.max(...valores)).toBeLessThan(1600);
  });
});

describe('normalizeInviteToken', () => {
  it('acepta el token tal como lo pegue quien se registra', () => {
    const canonico = 'ABCDEFGHJKMNPQRSTUVW';

    expect(normalizeInviteToken('ABCDE-FGHJK-MNPQR-STUVW')).toBe(canonico);
    expect(normalizeInviteToken('abcde-fghjk-mnpqr-stuvw')).toBe(canonico);
    expect(normalizeInviteToken('  ABCDE FGHJK MNPQR STUVW  ')).toBe(canonico);
    expect(normalizeInviteToken('ABCDEFGHJKMNPQRSTUVW')).toBe(canonico);
  });
});

describe('hashInviteToken', () => {
  it('devuelve un SHA-256 en hexadecimal', () => {
    expect(hashInviteToken('ABCDE-FGHJK-MNPQR-STUVW')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('da el mismo hash para las distintas formas de escribir el mismo token', () => {
    // Es lo que permite buscar por hash en la base sin exigir un formato exacto.
    expect(hashInviteToken('abcde fghjk mnpqr stuvw')).toBe(
      hashInviteToken('ABCDE-FGHJK-MNPQR-STUVW')
    );
  });

  it('da hashes distintos para tokens distintos', () => {
    expect(hashInviteToken('ABCDE-FGHJK-MNPQR-STUVW')).not.toBe(
      hashInviteToken('ABCDE-FGHJK-MNPQR-STUVX')
    );
  });

  it('nunca deja ver el token original', () => {
    const token = generateInviteToken();
    expect(hashInviteToken(token)).not.toContain(normalizeInviteToken(token));
  });
});
