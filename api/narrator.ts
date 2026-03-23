/**
 * Frontier — Narrator API Edge Function
 *
 * Vercel serverless function that proxies requests to an LLM provider.
 * Supports Anthropic (Claude) and Moonshot (Kimi 2.5) providers.
 * Per GDD §9.4: IP-based rate limiting + integrityHash session validation.
 *
 * Route: POST /api/narrator
 *
 * Anthropic-specific upgrades:
 * - System message sent as a cached block (cache_control: ephemeral) per VOICE_BIBLES.
 * - Per-voice temperature and max_tokens calibrated from Narrator Research Brief.
 * - User turn structured as XML to force style rendering, not input copying.
 * - Model updated to claude-sonnet-4-6.
 *
 * NOTE: Rate limiting + session validation require Vercel KV (stub TODO).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Rate limit tiers per GDD §9.4
const _RATE_LIMITS = {
  normal: { requests: 10, windowSeconds: 60 },
  burst: { requests: 20, windowSeconds: 60, softLockMinutes: 5 },
  sustained: { requests: 100, windowSeconds: 3600, blockHours: 24 },
} as const;

// ============================================================
// PROVIDER CONFIGURATION
// ============================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

const MOONSHOT_API_URL = 'https://api.moonshot.ai/v1/chat/completions';
const MOONSHOT_MODEL = 'moonshot-v1-8k';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

type NarratorProvider = 'anthropic' | 'moonshot' | 'gemini';

/**
 * Per-voice temperature and max_tokens, calibrated per the AI Narrator Research Brief.
 * Adams 0.65 (controlled precision), Irving 0.75 (ornate variety), McMurtry 0.55 (plain control).
 * Keyed by AuthorVoice enum values ('adams' | 'irving' | 'mcmurtry').
 */
const VOICE_CONFIG: Record<string, { temperature: number; maxTokens: number }> = {
  adams:   { temperature: 0.65, maxTokens: 400 },
  irving:  { temperature: 0.75, maxTokens: 600 },
  mcmurtry: { temperature: 0.55, maxTokens: 450 },
};

const VOICE_CONFIG_DEFAULT = { temperature: 0.65, maxTokens: 450 };

// ============================================================
// PROVIDER HELPERS
// ============================================================

/**
 * Assemble the user turn as structured XML.
 * XML structure forces the model to render game state through its voice lens
 * rather than copying input phrasing (per Narrator Research Brief recommendation).
 */
function assembleXMLUserContent(prompt: any): string {
  const parts: string[] = [];

  // Narrative memory context (ledger, character bibles, previous entry)
  const narrativeParts: string[] = [];
  if (prompt.ledgerContext) {
    narrativeParts.push(`<ledger>\n${prompt.ledgerContext}\n</ledger>`);
  }
  if (prompt.characterBibles) {
    narrativeParts.push(`<character_bibles>\n${prompt.characterBibles}\n</character_bibles>`);
  }
  if (prompt.previousEntry) {
    narrativeParts.push(`<previous_entry>\n${prompt.previousEntry}\n</previous_entry>`);
  }
  if (narrativeParts.length > 0) {
    parts.push(`<narrative_context>\n${narrativeParts.join('\n')}\n</narrative_context>`);
  }

  // Game state snapshot (JSON)
  if (prompt.gameStateSnapshot) {
    parts.push(`<game_state>\n${prompt.gameStateSnapshot}\n</game_state>`);
  }

  // Event record (JSON)
  if (prompt.eventRecord) {
    parts.push(`<event_record>\n${prompt.eventRecord}\n</event_record>`);
  }

  // Voice directive (JSON — emotional arc, word count targets)
  if (prompt.voiceDirective) {
    parts.push(`<voice_directive>\n${prompt.voiceDirective}\n</voice_directive>`);
  }

  // Encounter context (plain text, may be empty)
  if (prompt.encounterContext) {
    parts.push(`<encounter_context>\n${prompt.encounterContext}\n</encounter_context>`);
  }

  parts.push(`<generation_request>
Write the journal entry now. Output only the prose — no headers, no labels, no game mechanics.
</generation_request>`);

  return parts.join('\n\n');
}

/** Anthropic response shape (content blocks + usage). */
interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

/**
 * Call the Anthropic Messages API with prompt caching and per-voice config.
 * System message is sent as a cached content block (cache_control: ephemeral).
 * The voice bibles are ~2,500 tokens each — well above the 1,024-token minimum.
 */
async function callAnthropic(prompt: any): Promise<AnthropicResponse> {
  const voiceKey = (prompt.voice as string) || '';
  const voiceCfg = VOICE_CONFIG[voiceKey] ?? VOICE_CONFIG_DEFAULT;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: voiceCfg.maxTokens,
      temperature: voiceCfg.temperature,
      system: [
        {
          type: 'text',
          text: prompt.systemMessage,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: assembleXMLUserContent(prompt),
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Call the Moonshot (Kimi) API using OpenAI-compatible chat completions,
 * then normalise the response to match the Anthropic content-block format.
 */
async function callMoonshot(prompt: any): Promise<AnthropicResponse> {
  const response = await fetch(MOONSHOT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY || ''}`,
    },
    body: JSON.stringify({
      model: MOONSHOT_MODEL,
      max_tokens: 500,
      messages: [
        { role: 'system', content: prompt.systemMessage },
        { role: 'user', content: assembleXMLUserContent(prompt) },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Moonshot API error (${response.status}): ${error}`);
  }

  const data = await response.json();

  // Normalise OpenAI chat completions → Anthropic content-block format
  const text = (data.choices?.[0]?.message?.content as string) || '';
  return {
    content: [{ type: 'text', text }],
    usage: data.usage
      ? {
          input_tokens: data.usage.prompt_tokens || 0,
          output_tokens: data.usage.completion_tokens || 0,
        }
      : undefined,
  };
}

/**
 * Call the Google Gemini API and normalise to Anthropic content-block format.
 * Uses the REST generateContent endpoint with an API key (no OAuth needed).
 */
async function callGemini(prompt: any): Promise<AnthropicResponse> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: prompt.systemMessage }] },
      contents: [{ role: 'user', parts: [{ text: assembleXMLUserContent(prompt) }] }],
      generationConfig: { maxOutputTokens: 500 },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return {
    content: [{ type: 'text', text }],
    usage: data.usageMetadata
      ? {
          input_tokens: data.usageMetadata.promptTokenCount || 0,
          output_tokens: data.usageMetadata.candidatesTokenCount || 0,
        }
      : undefined,
  };
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS enforcement
  const origin = req.headers.origin;
  const allowedDomain = process.env.VITE_APP_DOMAIN || 'http://localhost:3000';
  if (origin && origin !== allowedDomain) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Extract fields from request
  const { integrityHash, prompt, provider: rawProvider } = req.body || {};
  if (!integrityHash || !prompt) {
    return res.status(400).json({ error: 'Missing integrityHash or prompt' });
  }

  // TODO: Validate integrityHash against session registry (Vercel KV)
  // TODO: Check IP rate limits (Vercel KV)
  // TODO: Validate state delta plausibility

  // Determine provider (default to moonshot for cost savings)
  const provider: NarratorProvider =
    rawProvider === 'anthropic' ? 'anthropic'
    : rawProvider === 'gemini' ? 'gemini'
    : 'moonshot';

  try {
    const data =
      provider === 'anthropic' ? await callAnthropic(prompt)
      : provider === 'gemini' ? await callGemini(prompt)
      : await callMoonshot(prompt);

    return res.status(200).json(data);
  } catch (err) {
    console.error(`Narrator proxy error (${provider}):`, err);
    return res.status(502).json({ error: 'Narrator API error' });
  }
}
