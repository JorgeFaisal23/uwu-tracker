import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { ApiError, AuthError } from './errors';

export { ApiError, AuthError } from './errors';

/**
 * Traduce cualquier error de un route handler a una respuesta JSON.
 *
 * Los errores de autorización conservan su código (401 / 403) y los de validación
 * devuelven 400 con el detalle por campo. El resto se registra en el servidor y se
 * responde con un mensaje genérico: antes se devolvía `err.message` tal cual, lo que
 * podía filtrar detalles internos de la base de datos al navegador.
 */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Datos inválidos.',
        details: err.issues.map(i => ({ campo: i.path.join('.'), problema: i.message })),
      },
      { status: 400 }
    );
  }

  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  console.error('[api] Error no controlado:', err);
  return NextResponse.json(
    { error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' },
    { status: 500 }
  );
}

/**
 * Lee y valida el cuerpo JSON de la petición contra un esquema.
 */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    throw new ApiError('El cuerpo de la petición no es JSON válido.', 400);
  }

  return schema.parse(raw);
}
