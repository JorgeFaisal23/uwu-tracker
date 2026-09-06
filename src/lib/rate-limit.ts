import 'server-only';

/**
 * Limitador de peticiones por ventana deslizante, en memoria del proceso.
 *
 * No es un limitador distribuido: en Vercel cada instancia serverless tiene su propio
 * mapa, así que el techo real es (instancias activas x límite). Aun así corta el caso
 * que importa —un script golpeando el mismo endpoint desde una IP—, porque esas ráfagas
 * se concentran sobre las instancias calientes. La barrera dura del registro es el
 * código de invitación; esto es la segunda línea y, sobre todo, lo que frena la fuerza
 * bruta contra el login.
 *
 * Deliberadamente NO vive en `proxy.ts`: la documentación de Next 16 advierte que el
 * proxy puede acabar desplegado en el CDN y que no hay que depender de estado
 * compartido ni de globales desde ahí.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Segundos que faltan para que se libere un hueco. 0 si la petición se admite. */
  retryAfterSeconds: number;
}

/** Marcas de tiempo de las peticiones recientes, por clave. */
const buckets = new Map<string, number[]>();

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_RETENTION_MS = 60 * 60 * 1000;
let lastSweep = Date.now();

/**
 * Sin esto el mapa crecería sin techo: cada IP nueva dejaría una entrada para siempre,
 * que es justo lo que provocaría un atacante rotando direcciones.
 */
function maybeSweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;

  for (const [key, hits] of buckets) {
    const newest = hits[hits.length - 1];
    if (newest === undefined || now - newest > MAX_RETENTION_MS) {
      buckets.delete(key);
    }
  }
}

/**
 * Registra un intento y dice si cabe dentro del límite.
 *
 * Cuando se rechaza no se apunta la marca: así una ráfaga bloqueada no alarga
 * indefinidamente su propio castigo.
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  maybeSweep(now);

  const hits = (buckets.get(key) ?? []).filter(t => now - t < windowMs);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    const oldest = hits[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  hits.push(now);
  buckets.set(key, hits);

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Dirección del cliente, para usarla como clave del limitador.
 *
 * `x-vercel-forwarded-for` va primero porque la fija la plataforma y sobrescribe lo que
 * mande el cliente: en el despliegue de Vercel es siempre la que se usa, y ahí el límite
 * por IP es sólido.
 *
 * Las otras dos son solo el respaldo para desarrollo local u otro alojamiento, y AMBAS
 * son falsificables por quien envía la petición: basta con mandar un `x-real-ip` distinto
 * en cada intento para estrenar cubo y esquivar el límite. Detrás de un proxy que las
 * reescriba (Vercel, Cloudflare, un nginx bien configurado) eso no ocurre; sirviendo la
 * aplicación a pelo, sí. Si algún día se deja Vercel, hay que dejar de confiar en ellas.
 *
 * El límite por IP es defensa en profundidad de todos modos: lo que realmente cierra el
 * registro es la invitación de un solo uso.
 */
export function clientIp(request: Request): string {
  const vercel = request.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0].trim();

  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  return 'desconocida';
}
