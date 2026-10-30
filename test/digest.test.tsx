import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest page and api', () => {
  it('GET /digest/2026-10-28 renders the table with 5 jobs and marks failure', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('digest · 2026-10-28');
    expect(html).toContain('lane/sync');
    expect(html).toContain('notes/backup');
    expect(html).toContain('quota exceeded');
    expect(html).toContain('class="warn">fail</td>');
    expect(html).toContain('class="warn">3</td>');
    expect(html).toContain('1 bad line skipped');
  });

  it('GET /digest/1999-01-01 returns 404', async () => {
    const res = await createApp(config).request('/digest/1999-01-01');
    expect(res.status).toBe(404);
  });

  it('GET /api/digest/2026-10-28 returns the same jobs in the same order as page', async () => {
    const pageRes = await createApp(config).request('/digest/2026-10-28');
    const html = await pageRes.text();

    const apiRes = await createApp(config).request('/api/digest/2026-10-28');
    expect(apiRes.status).toBe(200);
    const rows = (await apiRes.json()) as DigestRow[];

    expect(rows).toHaveLength(5);
    const expectedOrder = [
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ];
    expect(rows.map((r) => r.job)).toEqual(expectedOrder);

    // Verify order in HTML matches
    let lastIdx = -1;
    for (const job of expectedOrder) {
      const idx = html.indexOf(`<td>${job}</td>`);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  it('GET /api/digest/1999-01-01 returns 404', async () => {
    const res = await createApp(config).request('/api/digest/1999-01-01');
    expect(res.status).toBe(404);
  });
});
