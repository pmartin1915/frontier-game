/**
 * Tests for narrator voice directive parsing.
 */

import { describe, it, expect } from 'vitest';
import { parseVoiceFromDirective } from '@/engine/narrator';
import { AuthorVoice } from '@/types/narrative';

describe('parseVoiceFromDirective', () => {
  it('returns Adams for adams voice', () => {
    const directive = JSON.stringify({ voice: 'adams' });
    expect(parseVoiceFromDirective(directive)).toBe(AuthorVoice.Adams);
  });

  it('returns Irving for irving voice', () => {
    const directive = JSON.stringify({ voice: 'irving', constraints: {} });
    expect(parseVoiceFromDirective(directive)).toBe(AuthorVoice.Irving);
  });

  it('returns McMurtry for mcmurtry voice', () => {
    const directive = JSON.stringify({ voice: 'mcmurtry' });
    expect(parseVoiceFromDirective(directive)).toBe(AuthorVoice.McMurtry);
  });

  it('falls back to Adams on invalid JSON', () => {
    expect(parseVoiceFromDirective('not json')).toBe(AuthorVoice.Adams);
  });

  it('falls back to Adams on missing voice field', () => {
    const directive = JSON.stringify({ constraints: {} });
    expect(parseVoiceFromDirective(directive)).toBe(AuthorVoice.Adams);
  });

  it('falls back to Adams on unknown voice value', () => {
    const directive = JSON.stringify({ voice: 'hemingway' });
    expect(parseVoiceFromDirective(directive)).toBe(AuthorVoice.Adams);
  });

  it('falls back to Adams on empty string', () => {
    expect(parseVoiceFromDirective('')).toBe(AuthorVoice.Adams);
  });
});
