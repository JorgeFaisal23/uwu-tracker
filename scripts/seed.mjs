#!/usr/bin/env node
/**
 * Carga datos de ejemplo de Lux Obscura en la base de datos.
 *
 * Uso:
 *   node --env-file=.env.local scripts/seed.mjs
 *
 * Es para desarrollo y demos. No borra nada: si un personaje ya existe, lo salta.
 * Estos datos vivían dentro de src/lib/storage.ts, donde se recargaban en cada
 * arranque del servidor y se mezclaban con los datos reales.
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Ejecuta: node --env-file=.env.local scripts/seed.mjs'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DEMO_PASSWORD = 'lux123';

/** [nombre, mainJob, flexJobs, tankStance, [p1..p5]] */
const ROSTER = [
  ['Aria Thorne', 'WAR', ['DRK', 'PLD'], 'MT', [100, 100, 85, 0, 0]],
  ['Kaelen Vance', 'GNB', ['PLD'], 'OT', [100, 100, 100, 40, 0]],
  ['Lyra Moonwhisper', 'WHM', ['AST'], null, [100, 80, 0, 0, 0]],
  ['Rhein Astraea', 'SCH', ['SGE'], null, [100, 100, 60, 0, 0]],
  ['Soren Cross', 'RPR', ['VPR', 'SAM'], null, [100, 90, 0, 0, 0]],
  ['Nyx Shadowblade', 'NIN', ['DRG'], null, [100, 100, 100, 30, 0]],
  ['Zephyr Bowstring', 'DNC', ['BRD', 'MCH'], null, [100, 100, 95, 10, 0]],
  ['Elysia Starfall', 'PCT', ['SMN', 'RDM'], null, [100, 100, 75, 0, 0]],
  ['Dante Emberheart', 'SAM', ['MNK'], null, [100, 70, 0, 0, 0]],
  ['Sylvie Lunaris', 'AST', ['WHM'], null, [100, 100, 100, 70, 20]],
];

// Viernes, sábado y domingo por la noche: es donde coinciden los 8 necesarios.
const AVAILABILITY = [
  { day: 5, hours: [20, 21, 22] },
  { day: 6, hours: [19, 20, 21, 22] },
  { day: 0, hours: [20, 21] },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const memberIds = new Map();

  for (const [characterName, mainJob, flexJobs, tankStance, pcts] of ROSTER) {
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .ilike('character_name', characterName)
      .maybeSingle();

    if (existing) {
      console.log(`· ${characterName} ya existe, se conserva tal cual`);
      memberIds.set(characterName, existing.id);
      continue;
    }

    const { data: member, error } = await supabase
      .from('members')
      .insert({
        character_name: characterName,
        password_hash: passwordHash,
        main_job: mainJob,
        flex_jobs: flexJobs,
        tank_stance: tankStance,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`✗ ${characterName}:`, error.message);
      continue;
    }

    memberIds.set(characterName, member.id);

    const [p1, p2, p3, p4, p5] = pcts;
    await supabase.from('member_progress').upsert(
      {
        member_id: member.id,
        p1_garuda_pct: p1,
        p2_ifrit_pct: p2,
        p3_titan_pct: p3,
        p4_ultima_pct: p4,
        p5_roulette_pct: p5,
      },
      { onConflict: 'member_id' }
    );

    const slots = AVAILABILITY.flatMap(({ day, hours }) =>
      hours.map(hour => ({ dayOfWeek: day, hourSlot: hour }))
    );
    await supabase.rpc('replace_member_availability', {
      p_member_id: member.id,
      p_slots: slots,
    });

    console.log(`✓ ${characterName} (${mainJob})`);
  }

  console.log(
    `\nListo. ${memberIds.size} miembros. Contraseña de todos: "${DEMO_PASSWORD}".`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
