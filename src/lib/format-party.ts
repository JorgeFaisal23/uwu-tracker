import { ScheduledParty } from '@/types';
import { formatDateToSpanish } from './date-utils';

/**
 * Formateador unificado de una party para Discord.
 *
 * Se utiliza tanto en el webhook automático del servidor (`src/lib/discord.ts`)
 * como en el botón del cliente para copiar al portapapeles.
 * Vive fuera de `discord.ts` para no importar `server-only` en el cliente.
 */
export function formatPartyForDiscord(
  party: ScheduledParty,
  options?: { roleMention?: string }
): string {
  const dateText = formatDateToSpanish(party.scheduledDate, false);
  const hourLabel = `${party.hourSlot.toString().padStart(2, '0')}:00 CDMX`;
  const headerLines: string[] = [];

  if (options?.roleMention) {
    headerLines.push(options.roleMention);
  }

  headerLines.push('⚔️ **Incursión Oficial UWU — Lux Obscura**');
  headerLines.push(`📅 **Horario:** ${dateText} a las ${hourLabel} (${party.durationHours}h)`);
  if (party.notes) {
    headerLines.push(`📝 **Notas:** ${party.notes}`);
  }

  const roleOrder: Record<string, number> = {
    MT: 1,
    OT: 2,
    PH: 3,
    SH: 4,
    M1: 5,
    M2: 6,
    PR: 7,
    C: 8,
  };

  const sortedMembers = [...party.members].sort(
    (a, b) => (roleOrder[a.assignedRole] ?? 99) - (roleOrder[b.assignedRole] ?? 99)
  );

  const tanks = sortedMembers.filter(m => m.assignedRole === 'MT' || m.assignedRole === 'OT');
  const healers = sortedMembers.filter(m => m.assignedRole === 'PH' || m.assignedRole === 'SH');
  const dps = sortedMembers.filter(m =>
    ['M1', 'M2', 'PR', 'C'].includes(m.assignedRole)
  );

  const formatMember = (m: ScheduledParty['members'][0]) =>
    `• **${m.assignedRole}**: ${m.characterName} (${m.assignedJob})${m.isMainJob ? ' `[Main]`' : ''}`;

  const sections: string[] = [
    headerLines.join('\n'),
    `🛡️ **Tanques:**\n${tanks.map(formatMember).join('\n')}`,
    `💚 **Sanadores:**\n${healers.map(formatMember).join('\n')}`,
    `⚔️ **DPS:**\n${dps.map(formatMember).join('\n')}`,
  ];

  return sections.join('\n\n');
}
