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
