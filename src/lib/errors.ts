/**
 * Errores de dominio con mensaje pensado para mostrarse al usuario y con el código
 * HTTP que les corresponde. Viven aparte de `api.ts` para que la capa de datos pueda
 * lanzarlos sin arrastrar `server-only` ni las cookies de sesión.
 */

/** Error de negocio: el dato es válido pero la operación no procede. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 = 400
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Error de autorización: 401 sin sesión, 403 con sesión insuficiente. */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Se superó el límite de peticiones. Lleva su propio tipo porque la respuesta 429 debe
 * incluir la cabecera `Retry-After`, y para eso hace falta saber cuántos segundos faltan.
 */
export class RateLimitError extends Error {
  readonly status = 429 as const;

  constructor(
    message: string,
    readonly retryAfterSeconds: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}
