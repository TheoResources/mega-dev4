import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('status board', () => {
  it('shows the lane banner and the nights on disk with links and counts', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const app = createApp(config);
    const res = await app.request('/');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('<a href="/digest/2026-10-28">2026-10-28</a>');
    expect(html).toContain('<a href="/digest/2026-10-27">2026-10-27</a>');
    expect(html).toContain('10 ok');
    expect(html).toContain('4 retry');
    expect(html).toContain('1 fail');

    // Both nights render
    const res28 = await app.request('/digest/2026-10-28');
    expect(res28.status).toBe(200);

    const res27 = await app.request('/digest/2026-10-27');
    expect(res27.status).toBe(200);
  });

  it('health answers with the lane id', async () => {
    const res = await createApp(config).request('/health');
    expect(await res.json()).toEqual({ ok: true, lane: 'lane-07' });
  });
});
