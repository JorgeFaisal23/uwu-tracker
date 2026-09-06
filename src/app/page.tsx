import { verifySession } from '@/lib/session';
import LoginGate from '@/components/login-gate';
import TrackerApp from '@/components/tracker-app';

/**
 * Puerta de entrada de la aplicación.
 *
 * La comprobación vive en el servidor a propósito. Hecha en el cliente, el navegador
 * habría recibido igualmente el HTML y los datos y solo habríamos tapado la vista; aquí,
 * quien no tiene sesión no llega a que se consulte nada de la FC.
 *
 * Leer la cookie hace la ruta dinámica por sí solo, así que no hay riesgo de que este
 * render se sirva cacheado a otra persona.
 *
 * Esto no sustituye a la autorización de los route handlers: `/api/members`,
 * `/api/parties`, `/api/availability` y `/api/history` exigen sesión por su cuenta.
 * La regla es la de la guía de Next: la comprobación de verdad, lo más cerca posible
 * del dato.
 */
export default async function Home() {
  const session = await verifySession();

  if (!session) return <LoginGate />;

  return <TrackerApp initialSession={session} />;
}
