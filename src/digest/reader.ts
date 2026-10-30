import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, NightDigest } from './types.js';

export function readNight(runsDir: string, night: string): NightDigest | null {
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) {
    return null;
  }

  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  let badLines = 0;
  const jobMap = new Map<
    string,
    {
      job: string;
      owner: string | null;
      runs: number;
      retries: number;
      lastStatus: JobStatus;
      lastError: string | null;
      firstTime: string;
      lastTime: string;
    }
  >();

  let entryOk = 0;
  let entryRetry = 0;
  let entryFail = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      badLines++;
      continue;
    }

    if (!parsed || typeof parsed !== 'object') {
      badLines++;
      continue;
    }

    const record = parsed as Record<string, unknown>;
    const at = typeof record.at === 'string' ? record.at : null;
    const job = typeof record.job === 'string' ? record.job : null;
    const status = record.status;
    const owner = typeof record.owner === 'string' ? record.owner : null;
    const error = typeof record.error === 'string' ? record.error : null;

    if (!at || !job || (status !== 'ok' && status !== 'retry' && status !== 'fail')) {
      badLines++;
      continue;
    }

    const jobStatus = status as JobStatus;
    if (jobStatus === 'ok') entryOk++;
    else if (jobStatus === 'retry') entryRetry++;
    else if (jobStatus === 'fail') entryFail++;

    const existing = jobMap.get(job);
    if (!existing) {
      jobMap.set(job, {
        job,
        owner,
        runs: 1,
        retries: jobStatus === 'retry' ? 1 : 0,
        lastStatus: jobStatus,
        lastError: error,
        firstTime: at,
        lastTime: at,
      });
    } else {
      existing.runs += 1;
      if (jobStatus === 'retry') {
        existing.retries += 1;
      }
      existing.lastStatus = jobStatus;
      if (error !== null) {
        existing.lastError = error;
      }
      if (owner !== null) {
        existing.owner = owner;
      }
      // Times: keep firstTime as earliest seen, update lastTime to latest
      if (at < existing.firstTime) {
        existing.firstTime = at;
      }
      if (at > existing.lastTime) {
        existing.lastTime = at;
      }
    }
  }

  const rows: DigestRow[] = Array.from(jobMap.values()).sort((a, b) => a.job.localeCompare(b.job));

  return {
    night,
    rows,
    badLines,
    counts: {
      ok: entryOk,
      retry: entryRetry,
      fail: entryFail,
    },
  };
}
