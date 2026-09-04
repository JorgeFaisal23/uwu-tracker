import 'server-only';

import { ScheduledParty } from '@/types';
import { formatPartyForDiscord } from './format-party';
import { formatDateToSpanish } from './date-utils';

/**
 * Notificaciones a Discord mediante Webhook.
 *
 * Directrices:
 * 1. Fallo silencioso: si Discord está caído o la URL es errónea, se registra el error
 *    en consola del servidor y la party sigue su curso sin romper la petición HTTP.
 * 2. Whitelist estricta de menciones (allowed_mentions):
 *    Solo se permite mencionar el rol @UWU (`DISCORD_UWU_ROLE_ID`).
 *    `parse: []` desactiva @everyone, @here y menciones a usuarios para evitar abusos
 *    en el campo libre de notas del admin.
 * 3. Si `DISCORD_WEBHOOK_URL` no está definida, no hace nada (soporte opcional).
 */

function getWebhookUrl(): string | undefined {
  const url = process.env.DISCORD_WEBHOOK_URL?.trim();
  return url && url.length > 0 ? url : undefined;
}

function getRoleId(): string | undefined {
  const roleId = process.env.DISCORD_UWU_ROLE_ID?.trim();
  return roleId && roleId.length > 0 ? roleId : undefined;
}

async function sendDiscordPayload(content: string): Promise<void> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return;

  const roleId = getRoleId();
  const allowedMentions = {
    roles: roleId ? [roleId] : [],
    parse: [],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        allowed_mentions: allowedMentions,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Sin detalle');
      console.error(`[discord] Error en webhook (${res.status}):`, errorText);
    }
  } catch (err) {
    console.error('[discord] Error conectando con el webhook de Discord:', err);
  }
}

export async function notifyPartyScheduled(party: ScheduledParty): Promise<void> {
  const roleId = getRoleId();
  const roleMention = roleId ? `<@&${roleId}>` : undefined;
  const content = formatPartyForDiscord(party, { roleMention });
  await sendDiscordPayload(content);
}

export async function notifyPartyCancelled(party: ScheduledParty): Promise<void> {
  const dateText = formatDateToSpanish(party.scheduledDate, false);
  const hourLabel = `${party.hourSlot.toString().padStart(2, '0')}:00 CDMX`;
  const roleId = getRoleId();
  const roleMention = roleId ? `<@&${roleId}> ` : '';

  const content = `${roleMention}❌ **Incursión Cancelada:** La sesión programada para el **${dateText}** a las **${hourLabel}** (${party.startTimeLabel}) ha sido cancelada por el Administrador.`;
  await sendDiscordPayload(content);
}
