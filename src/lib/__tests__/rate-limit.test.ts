import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientIp, rateLimit } from '../rate-limit';

/** Cada test usa su propia clave: el limitador guarda estado entre llamadas a propósito. */
let contador = 0;
const nuevaClave = () => `test:${contador++}`;

afterEach(() => {
  vi.useRealTimers();
});

describe('rateLimit', () => {
  it('admite peticiones hasta el límite y rechaza la siguiente', () => {
    const clave = nuevaClave();
    const opciones = { limit: 3, windowMs: 60_000 };

    expect(rateLimit(clave, opciones).allowed).toBe(true);
    expect(rateLimit(clave, opciones).allowed).toBe(true);
    expect(rateLimit(clave, opciones).allowed).toBe(true);
    expect(rateLimit(clave, opciones).allowed).toBe(false);
  });

  it('lleva cuentas independientes por clave', () => {
    const opciones = { limit: 1, windowMs: 60_000 };
    const unaIp = nuevaClave();
    const otraIp = nuevaClave();

    expect(rateLimit(unaIp, opciones).allowed).toBe(true);
    expect(rateLimit(unaIp, opciones).allowed).toBe(false);
    // Bloquear una IP no debe afectar al resto de miembros de la FC.
    expect(rateLimit(otraIp, opciones).allowed).toBe(true);
  });

  it('vuelve a admitir cuando la ventana ha pasado', () => {
    vi.useFakeTimers();
    const clave = nuevaClave();
    const opciones = { limit: 2, windowMs: 60_000 };

    expect(rateLimit(clave, opciones).allowed).toBe(true);
    expect(rateLimit(clave, opciones).allowed).toBe(true);
    expect(rateLimit(clave, opciones).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(rateLimit(clave, opciones).allowed).toBe(true);
  });

  it('informa de cuántos segundos faltan para el siguiente hueco', () => {
    vi.useFakeTimers();
    const clave = nuevaClave();
    const opciones = { limit: 1, windowMs: 60_000 };

    rateLimit(clave, opciones);
    vi.advanceTimersByTime(20_000);

    const rechazada = rateLimit(clave, opciones);
    expect(rechazada.allowed).toBe(false);
    expect(rechazada.retryAfterSeconds).toBe(40);
  });

  it('una petición rechazada no alarga su propio castigo', () => {
    vi.useFakeTimers();
    const clave = nuevaClave();
    const opciones = { limit: 1, windowMs: 60_000 };

    rateLimit(clave, opciones);

    // Insistir durante el bloqueo no debe empujar hacia adelante la ventana: si las
    // llamadas rechazadas se apuntaran, un bot terco quedaría bloqueado para siempre
    // y —peor— haría crecer el array sin control.
    vi.advanceTimersByTime(30_000);
    rateLimit(clave, opciones);
    rateLimit(clave, opciones);

    vi.advanceTimersByTime(30_001);
    expect(rateLimit(clave, opciones).allowed).toBe(true);
  });
});

describe('clientIp', () => {
  const conCabeceras = (headers: Record<string, string>) =>
    clientIp(new Request('https://ejemplo.test', { headers }));

  it('prefiere la cabecera de Vercel, que el cliente no puede falsificar', () => {
    expect(
      conCabeceras({
        'x-vercel-forwarded-for': '203.0.113.7',
        'x-forwarded-for': '10.0.0.1',
        'x-real-ip': '10.0.0.2',
      })
    ).toBe('203.0.113.7');
  });

  it('se queda con la primera dirección de una lista', () => {
    expect(conCabeceras({ 'x-vercel-forwarded-for': '203.0.113.7, 70.41.3.18' })).toBe(
      '203.0.113.7'
    );
  });

  it('recurre a x-forwarded-for solo si no hay nada mejor', () => {
    expect(conCabeceras({ 'x-forwarded-for': '203.0.113.9' })).toBe('203.0.113.9');
  });

  it('devuelve un valor estable cuando no hay ninguna cabecera', () => {
    // Todas las peticiones sin cabecera comparten cubo. Es lo correcto: preferimos
    // limitar de más a dejar un hueco sin límite.
    expect(conCabeceras({})).toBe('desconocida');
  });
});
