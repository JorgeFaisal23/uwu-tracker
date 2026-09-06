/**
 * Novedades de cada versión, contadas para quien usa la aplicación.
 *
 * Aquí solo entra lo que el miembro puede ver o tocar: botones nuevos, pantallas que
 * cambian, cosas que ahora se comportan distinto. Nada de infraestructura ni de cómo
 * está hecho por dentro.
 *
 * Al publicar una versión: sube `APP_VERSION` y añade su bloque al principio de
 * `CHANGELOG`. Con eso, a cada persona le vuelve a salir la ventana una sola vez.
 */

export const APP_VERSION = '0.2.1';

export interface ChangelogEntry {
  /** Titular corto, tal cual lo nombraría un miembro de la FC. */
  title: string;
  /** Qué gana quien lo usa, en una o dos frases. */
  description: string;
}

export interface ChangelogRelease {
  version: string;
  /** Fecha en texto, como se muestra: no se formatea ni se compara. */
  date: string;
  /** Resumen de la versión en una línea. */
  headline: string;
  entries: ChangelogEntry[];
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: '0.2.1',
    date: 'Septiembre 2026',
    headline:
      'Buscador de parties más potente, suplentes para incursiones y fases de Ultima Weapon detalladas.',
    entries: [
      {
        title: 'Fases 4 y 5 corregidas con mecánicas de Ultima',
        description:
          'La Fase 4 ahora es Lahabrea y la Fase 5 es Ultima Weapon. Además, la barra de progreso de Ultima Weapon cuenta con marcadores visuales para sus mecánicas principales (Predation, Annihilation, Suppression y Primal Roulette), indicando con claridad qué punto de la pelea estás practicando.',
      },
      {
        title: 'Explorador de combinaciones con filtros y paginación',
        description:
          'Navega y examina cómodamente todas las alternativas de party generadas para una franja horaria: filtra por miembro participante, job, fase promedio o número de main jobs, ordénalas según tu objetivo y copia el formato para Discord con un solo clic.',
      },
      {
        title: 'Postúlate como suplente ("¡Puedo ayudar!")',
        description:
          'Si no estás dentro de una party oficial programada pero tienes disponibilidad, ahora puedes ofrecerte como suplente indicando el rol y job que puedes cubrir junto con una nota para el líder.',
      },
      {
        title: 'Convocatorias para franjas casi listas',
        description:
          'Cuando un horario concurrido esté a punto de completarse y solo necesite uno o dos roles, los administradores pueden abrir una convocatoria destacada para que los miembros de la FC se sumen y alcancen el 8/8.',
      },
    ],
  },
  {
    version: '0.2',
    date: 'Septiembre 2026',
    headline: 'Tu progreso ahora entiende que no juegas igual en todos los roles.',
    entries: [
      {
        title: 'Progreso por rol',
        description:
          'En tu panel de personaje puedes elegir entre "Mismo progreso para todos" (como hasta ahora) o "Progreso por rol", donde cada rol que cubres lleva sus propios porcentajes. Pensado para cuando te sabes la pelea de tanque de memoria pero apenas la has jugado de caster. Los roles que no toques siguen usando tu progreso general.',
      },
      {
        title: 'Las parties te colocan con el progreso del puesto',
        description:
          'Cuando el buscador te pone en un puesto de flex, ya no cuenta tu progreso de main: usa el del rol de ese puesto. Además, cada hueco de la party muestra a la derecha el progreso con el que entra esa persona.',
      },
      {
        title: 'Progreso de cada rol a la vista en el roster',
        description:
          'Las fichas de quienes llevan progreso por rol muestran unas pastillas con el avance en cada rol. Se distingue de un vistazo el que tiene progreso propio del que hereda el general.',
      },
      {
        title: 'Las barras de fase siguen el orden de la pelea',
        description:
          'Al mover una fase, las anteriores se completan al 100% y las posteriores se vacían. Ya no puede quedarse Ultima Weapon al 40% con Titán a medias.',
      },
      {
        title: 'Lista de flex jobs plegable',
        description:
          'Si llevas muchos flex jobs, tu ficha ya no se desborda: se ven los primeros y un "+N" que despliega el resto al hacer clic.',
      },
      {
        title: 'Paneles más cómodos de usar',
        description:
          'El panel de personaje y el de administración mantienen la cabecera y el botón de guardar siempre a la vista, con scroll dentro del panel, y se cierran con Esc o haciendo clic fuera.',
      },
      {
        title: 'Esta ventana de novedades',
        description:
          'Aparece una sola vez tras iniciar sesión con cada versión nueva. Cuando quieras volver a leerla, está en el botón discreto de versión, arriba en tu panel de personaje.',
      },
    ],
  },
];

/** La versión que se muestra al abrir: siempre la primera de la lista. */
export const LATEST_RELEASE: ChangelogRelease = CHANGELOG[0];

const SEEN_KEY_PREFIX = 'uwu-tracker:changelog-seen:';

/**
 * Quién es "el usuario" a efectos de haber visto ya las novedades.
 *
 * Se guarda por persona y no de forma global para que dos cuentas que comparten
 * navegador no se roben la ventana la una a la otra.
 */
export function changelogUserKey(session: {
  type: 'ADMIN' | 'MEMBER' | 'GUEST';
  memberId?: string;
}): string | null {
  if (session.memberId) return session.memberId;
  if (session.type === 'ADMIN') return 'admin';
  return null;
}

/** Última versión cuyas novedades vio esta persona, o null si nunca vio ninguna. */
export function readSeenVersion(userKey: string): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY_PREFIX + userKey);
  } catch {
    // Navegador con el almacenamiento bloqueado: mejor no enseñar nada que reventar.
    return null;
  }
}

export function markVersionSeen(userKey: string, version: string): void {
  try {
    window.localStorage.setItem(SEEN_KEY_PREFIX + userKey, version);
  } catch {
    // Sin sitio donde anotarlo, la ventana volverá a salir. No es motivo para fallar.
  }
  for (const listener of listeners) listener();
}

/**
 * Lo ya visto vive en el navegador, fuera de React. Quien lo pinte se suscribe aquí
 * (con `useSyncExternalStore`) y así se entera en cuanto se marca una versión como
 * vista, sin tener que empujar el cambio desde un efecto.
 */
const listeners = new Set<() => void>();

export function subscribeSeenVersion(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
