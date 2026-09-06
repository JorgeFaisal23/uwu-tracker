import { describe, expect, it } from 'vitest';
import {
  buildProgress,
  editableSubroles,
  emptyMemberProgress,
  memberDisplayProgress,
  playableSubroles,
  resolveRoleProgress,
  roleProgressScore,
} from '../progress';
import type { MemberProgress } from '@/types';

const AT = '2026-01-01T00:00:00.000Z';

/** Un tanque que también juega SMN, con progreso muy distinto en cada rol. */
function tanqueQueFlexeaCaster(mode: MemberProgress['mode']): MemberProgress {
  return {
    memberId: 'm1',
    mode,
    general: buildProgress('m1', null, [100, 100, 100, 100, 0], AT),
    byRole: {
      CASTER: buildProgress('m1', 'CASTER', [40, 0, 0, 0, 0], AT),
    },
  };
}

describe('resolveRoleProgress', () => {
  it('en modo unificado devuelve el general para cualquier rol', () => {
    const mp = tanqueQueFlexeaCaster('UNIFIED');

    expect(roleProgressScore(mp, 'TANK')).toBe(400);
    // El ajuste de caster está guardado, pero el modo unificado no lo aplica.
    expect(roleProgressScore(mp, 'CASTER')).toBe(400);
  });

  it('en modo por rol usa el ajuste del rol y hereda el general en el resto', () => {
    const mp = tanqueQueFlexeaCaster('PER_ROLE');

    expect(roleProgressScore(mp, 'CASTER')).toBe(40);
    expect(roleProgressScore(mp, 'TANK')).toBe(400);
    expect(roleProgressScore(mp, 'MELEE')).toBe(400);
  });

  it('sin progreso guardado devuelve cero en vez de romper', () => {
    expect(resolveRoleProgress(undefined, 'TANK', 'm9').overallScore).toBe(0);
    expect(roleProgressScore(emptyMemberProgress('m9'), 'TANK')).toBe(0);
  });

  it('sin rol concreto devuelve siempre el general', () => {
    expect(resolveRoleProgress(tanqueQueFlexeaCaster('PER_ROLE'), null).overallScore).toBe(400);
  });
});

describe('memberDisplayProgress', () => {
  const member = { id: 'm1', mainJob: 'WAR' as const };

  it('representa al miembro por el progreso de su main job', () => {
    expect(memberDisplayProgress(member, tanqueQueFlexeaCaster('PER_ROLE')).overallScore).toBe(400);
    expect(
      memberDisplayProgress({ id: 'm1', mainJob: 'SMN' }, tanqueQueFlexeaCaster('PER_ROLE'))
        .overallScore
    ).toBe(40);
  });
});

describe('playableSubroles y editableSubroles', () => {
  const member = { mainJob: 'WAR' as const, flexJobs: ['SMN', 'SGE'] as const };

  it('lista los subroles del main job y de los flex, en orden de puesto', () => {
    expect(playableSubroles({ ...member, flexJobs: [...member.flexJobs] })).toEqual([
      'TANK',
      'SHIELD_HEALER',
      'CASTER',
    ]);
  });

  it('conserva un rol con progreso guardado aunque ya no tenga job para jugarlo', () => {
    const mp: MemberProgress = {
      ...emptyMemberProgress('m1'),
      mode: 'PER_ROLE',
      byRole: { MELEE: buildProgress('m1', 'MELEE', [100, 0, 0, 0, 0], AT) },
    };

    // Dejó de llevar el melee en su perfil, pero el progreso que registró sigue visible.
    expect(editableSubroles({ mainJob: 'WAR', flexJobs: [] }, mp)).toEqual(['TANK', 'MELEE']);
  });
});
