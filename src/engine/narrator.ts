/**
 * Frontier — Layer 3: Narrator
 *
 * Calls the Anthropic API via the Vercel edge proxy.
 * Returns prose text. Never modifies game state.
 *
 * Includes timeout handling: if the API doesn't respond within
 * NARRATOR_TIMEOUT_MS (8s), injects a fallback entry.
 */

import type { NarratorPrompt, NarratorResponse } from '@/types/narrative';
import { NARRATOR_TIMEOUT_MS, AuthorVoice } from '@/types/narrative';
import { selectFallbackEntry } from '@/data/fallback-ledger';
import type { Biome, MoraleState } from '@/types/game-state';

const NARRATOR_ENDPOINT = '/api/narrator';

/** Valid AuthorVoice values for runtime validation. */
const VALID_VOICES = new Set<string>([
  AuthorVoice.Adams,
  AuthorVoice.Irving,
  AuthorVoice.McMurtry,
]);

/**
 * Parse the voice from the Director's serialised voiceDirective JSON.
 * Falls back to Adams on any parse or validation failure.
 */
export function parseVoiceFromDirective(voiceDirective: string): AuthorVoice {
  try {
    const parsed = JSON.parse(voiceDirective);
    const voice = parsed?.voice;
    if (typeof voice === 'string' && VALID_VOICES.has(voice)) {
      return voice as AuthorVoice;
    }
  } catch {
    // JSON parse failure — use fallback
  }
  return AuthorVoice.Adams;
}

/**
 * Call the Narrator API with timeout fallback.
 */
export async function callNarrator(
  prompt: NarratorPrompt,
  integrityHash: string,
  biome: Biome,
  moraleState: MoraleState,
): Promise<NarratorResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NARRATOR_TIMEOUT_MS);

  try {
    const start = performance.now();
    const response = await fetch(NARRATOR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integrityHash,
        prompt,
        provider: (import.meta.env.VITE_NARRATOR_PROVIDER as string) || 'moonshot',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Narrator API returned ${response.status}`);
    }

    const data = await response.json();
    const text = data.content
      ?.map((block: any) => (block.type === 'text' ? block.text : ''))
      .filter(Boolean)
      .join('\n') || '';

    return {
      text,
      fallback: false,
      voice: parseVoiceFromDirective(prompt.voiceDirective),
      latencyMs: performance.now() - start,
      tokensUsed: data.usage
        ? {
            input: data.usage.input_tokens || 0,
            output: data.usage.output_tokens || 0,
            cacheRead: data.usage.cache_read_input_tokens || 0,
            cacheWrite: data.usage.cache_creation_input_tokens || 0,
          }
        : null,
    };
  } catch (err) {
    clearTimeout(timeout);
    console.warn('Narrator API failed, using fallback:', err);

    // Inject fallback entry
    const fallback = selectFallbackEntry(biome, moraleState);
    return {
      text: fallback.text,
      fallback: true,
      voice: AuthorVoice.Adams,
      latencyMs: 0,
      tokensUsed: null,
    };
  }
}
