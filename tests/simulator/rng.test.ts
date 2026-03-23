import { describe, it, expect } from 'vitest';
import { createSeededRng } from '@/simulator/rng';

describe('createSeededRng', () => {
  it('produces deterministic output for the same seed', () => {
    const rng1 = createSeededRng(42);
    const rng2 = createSeededRng(42);

    const seq1 = Array.from({ length: 20 }, () => rng1());
    const seq2 = Array.from({ length: 20 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it('produces different output for different seeds', () => {
    const rng1 = createSeededRng(1);
    const rng2 = createSeededRng(2);

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).not.toEqual(seq2);
  });

  it('produces values in [0, 1)', () => {
    const rng = createSeededRng(99);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('produces varied values (not all the same)', () => {
    const rng = createSeededRng(7);
    const values = new Set(Array.from({ length: 100 }, () => rng()));
    expect(values.size).toBeGreaterThan(90);
  });

  it('handles seed 0 without degenerate output', () => {
    const rng = createSeededRng(0);
    const values = Array.from({ length: 10 }, () => rng());
    const unique = new Set(values);
    expect(unique.size).toBeGreaterThan(5);
  });

  it('handles negative seeds', () => {
    const rng = createSeededRng(-12345);
    const values = Array.from({ length: 10 }, () => rng());
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});
