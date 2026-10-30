import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest page', () => {
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
});
