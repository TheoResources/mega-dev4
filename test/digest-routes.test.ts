import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

describe('digest routes with temp runs dir', () => {
  let tempDir: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'rig-runs-test-'));

    // 1. Normal night with entries
    writeFileSync(
      join(tempDir, '2026-10-30.jsonl'),
      JSON.stringify({
        at: '2026-10-30T02:00:00+01:00',
        job: 'backup/db',
        status: 'ok',
        owner: 'lane-07',
      }) + '\n',
    );

    // 2. Empty night
    writeFileSync(join(tempDir, '2026-10-31.jsonl'), '');

    // 3. Night with a bad line and a valid line
    writeFileSync(
      join(tempDir, '2026-11-01.jsonl'),
      'not valid json\n' +
        JSON.stringify({
          at: '2026-11-01T03:00:00+01:00',
          job: 'cache/purge',
          status: 'retry',
          owner: 'rook',
          error: 'timeout',
        }) +
        '\n',
    );

    app = createApp({
      adapter: 'shim',
      installed: '2026-10-29T14:06:00+01:00',
      beatEverySeconds: 60,
      runsDir: tempDir,
    });
  });

  afterAll(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('GET /digest/:night (HTML)', () => {
    it('returns 200 for a night with entries', async () => {
      const res = await app.request('/digest/2026-10-30');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('digest · 2026-10-30');
      expect(html).toContain('backup/db');
      expect(html).toContain('lane-07');
    });

    it('returns 404 for a night with no file', async () => {
      const res = await app.request('/digest/2026-10-01');
      expect(res.status).toBe(404);
    });

    it('returns 200 and renders "nothing ran" for an empty night', async () => {
      const res = await app.request('/digest/2026-10-31');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('digest · 2026-10-31');
      expect(html).toContain('nothing ran');
    });

    it('returns 200 and counts bad lines for a night with an unparseable line', async () => {
      const res = await app.request('/digest/2026-11-01');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('digest · 2026-11-01');
      expect(html).toContain('cache/purge');
      expect(html).toContain('1 bad line skipped');
    });
  });

  describe('GET /api/digest/:night (JSON)', () => {
    it('returns 200 and rows for a night with entries', async () => {
      const res = await app.request('/api/digest/2026-10-30');
      expect(res.status).toBe(200);
      const rows = (await res.json()) as DigestRow[];
      expect(rows).toHaveLength(1);
      expect(rows[0].job).toBe('backup/db');
      expect(rows[0].owner).toBe('lane-07');
      expect(rows[0].lastStatus).toBe('ok');
    });

    it('returns 404 for a night with no file', async () => {
      const res = await app.request('/api/digest/2026-10-01');
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'not found' });
    });

    it('returns 200 and empty array for an empty night', async () => {
      const res = await app.request('/api/digest/2026-10-31');
      expect(res.status).toBe(200);
      const rows = (await res.json()) as DigestRow[];
      expect(rows).toEqual([]);
    });

    it('returns 200 and valid rows when bad lines are present', async () => {
      const res = await app.request('/api/digest/2026-11-01');
      expect(res.status).toBe(200);
      const rows = (await res.json()) as DigestRow[];
      expect(rows).toHaveLength(1);
      expect(rows[0].job).toBe('cache/purge');
      expect(rows[0].retries).toBe(1);
      expect(rows[0].lastError).toBe('timeout');
    });
  });
});
