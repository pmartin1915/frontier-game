import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { archiveLedgerEntry, getArchivedEntries } from '@/persistence/save-load';
import { deleteDatabase } from '@/persistence/db';
import type { LedgerEntry } from '@/types/narrative';

// ============================================================
// HELPERS
// ============================================================

function makeLedgerEntry(period: string): LedgerEntry {
  return {
    period,
    act: 'Act I: Cross Timbers',
    majorEvents: ['Traveled 120 miles'],
    activeThreads: [],
    relationships: [],
    pendingConsequences: [],
    emotionalArc: 'Steady determination',
    lossesAndGains: [],
  };
}

// ============================================================
// TESTS
// ============================================================

describe('archive bucket', () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  afterEach(async () => {
    await deleteDatabase();
  });

  it('archives a single ledger entry', async () => {
    const entry = makeLedgerEntry('Days 1-5');
    await archiveLedgerEntry(entry);

    const entries = await getArchivedEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].period).toBe('Days 1-5');
  });

  it('archives multiple entries with incrementing keys', async () => {
    await archiveLedgerEntry(makeLedgerEntry('Days 1-5'));
    await archiveLedgerEntry(makeLedgerEntry('Days 6-10'));
    await archiveLedgerEntry(makeLedgerEntry('Days 11-15'));

    const entries = await getArchivedEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0].period).toBe('Days 1-5');
    expect(entries[1].period).toBe('Days 6-10');
    expect(entries[2].period).toBe('Days 11-15');
  });

  it('returns empty array when no entries archived', async () => {
    const entries = await getArchivedEntries();
    expect(entries).toHaveLength(0);
  });

  it('preserves full ledger entry structure', async () => {
    const entry: LedgerEntry = {
      period: 'Days 1-5',
      act: 'Act II: Staked Plains',
      majorEvents: ['Survived a dust storm', 'Found a natural spring'],
      activeThreads: [{ id: 'thread_test', description: 'Test thread', status: 'open' }],
      relationships: [],
      pendingConsequences: [{ description: 'Low water', severity: 'high', deadline: 'Days 6-10' }],
      emotionalArc: 'Growing desperation',
      lossesAndGains: ['Lost 5 units of water'],
    };
    await archiveLedgerEntry(entry);

    const entries = await getArchivedEntries();
    expect(entries[0]).toEqual(entry);
  });
});
