import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('run log reader', () => {
  it('reads runs/2026-10-28.jsonl with 5 jobs and 1 bad line', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest).not.toBeNull();
    if (!digest) return;

    expect(digest.badLines).toBe(1);
    expect(digest.rows).toHaveLength(5);

    const jobNames = digest.rows.map((r) => r.job);
    expect(jobNames).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);

    const backup = digest.rows.find((r) => r.job === 'notes/backup');
    expect(backup?.lastStatus).toBe('fail');
    expect(backup?.lastError).toBe('quota exceeded');
    expect(backup?.owner).toBe('lane-07');

    const render = digest.rows.find((r) => r.job === 'digest/render');
    expect(render?.owner).toBeNull();

    const refresh = digest.rows.find((r) => r.job === 'fixtures/refresh');
    expect(refresh?.retries).toBe(3);
    expect(refresh?.lastStatus).toBe('ok');
  });

  it('returns null for non-existent night', () => {
    const digest = readNight('runs', '1999-01-01');
    expect(digest).toBeNull();
  });
});
