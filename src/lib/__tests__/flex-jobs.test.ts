import { describe, it, expect } from 'vitest';
import { JobId } from '@/types';
import { FFXIV_JOBS } from '@/lib/ffxiv-jobs';

describe('Flex Jobs Display Logic', () => {
  const getVisibleAndHiddenJobs = (jobs: JobId[], maxPreview = 3) => {
    const shouldTruncate = jobs.length > maxPreview + 1;
    const visibleJobs = shouldTruncate ? jobs.slice(0, maxPreview) : jobs;
    const hiddenJobs = shouldTruncate ? jobs.slice(maxPreview) : [];
    return { shouldTruncate, visibleJobs, hiddenJobs };
  };

  it('handles empty jobs array', () => {
    const { shouldTruncate, visibleJobs, hiddenJobs } = getVisibleAndHiddenJobs([]);
    expect(shouldTruncate).toBe(false);
    expect(visibleJobs).toEqual([]);
    expect(hiddenJobs).toEqual([]);
  });

  it('does not truncate when jobs <= 4', () => {
    const jobs: JobId[] = ['GNB', 'PLD', 'WHM', 'DRG'];
    const { shouldTruncate, visibleJobs, hiddenJobs } = getVisibleAndHiddenJobs(jobs);
    expect(shouldTruncate).toBe(false);
    expect(visibleJobs).toHaveLength(4);
    expect(hiddenJobs).toHaveLength(0);
  });

  it('truncates to first 3 and shows +2 when 5 jobs provided', () => {
    const jobs: JobId[] = ['GNB', 'PLD', 'WHM', 'DRG', 'MNK'];
    const { shouldTruncate, visibleJobs, hiddenJobs } = getVisibleAndHiddenJobs(jobs);
    expect(shouldTruncate).toBe(true);
    expect(visibleJobs).toEqual(['GNB', 'PLD', 'WHM']);
    expect(hiddenJobs).toEqual(['DRG', 'MNK']);
    expect(hiddenJobs).toHaveLength(2);
  });

  it('truncates correctly for 17 jobs (like in screenshot)', () => {
    const jobs: JobId[] = [
      'GNB', 'PLD', 'WHM', 'DRG', 'MNK', 'SGE', 'NIN', 'SAM',
      'RPR', 'VPR', 'DNC', 'BLM', 'SMN', 'RDM', 'PCT', 'AST', 'MCH'
    ];
    const { shouldTruncate, visibleJobs, hiddenJobs } = getVisibleAndHiddenJobs(jobs);
    expect(shouldTruncate).toBe(true);
    expect(visibleJobs).toEqual(['GNB', 'PLD', 'WHM']);
    expect(hiddenJobs).toHaveLength(14);
    expect(hiddenJobs[0]).toBe('DRG');
  });

  it('ensures all jobs have valid names in FFXIV_JOBS for tooltips', () => {
    const jobs: JobId[] = ['GNB', 'PLD', 'WHM', 'DRG', 'MNK', 'SGE', 'NIN', 'SAM', 'RPR', 'VPR', 'DNC', 'BLM', 'SMN', 'RDM', 'PCT', 'AST', 'MCH'];
    jobs.forEach(job => {
      expect(FFXIV_JOBS[job]).toBeDefined();
      expect(FFXIV_JOBS[job].name).toBeDefined();
    });
  });
});
