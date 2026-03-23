/**
 * Frontier — Narrator API Integration Test
 *
 * Standalone script to validate Moonshot and Gemini API connectivity
 * with a realistic NarratorPrompt. Runs via: npm run test:narrator
 *
 * Reads API keys from .env.local in the project root (never committed).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================
// ENV LOADER
// ============================================================

function loadEnvLocal(): void {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const text = readFileSync(envPath, 'utf-8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key && !(key in process.env)) {
        process.env[key] = value;
      }
    }
    console.log('  Loaded .env.local\n');
  } catch {
    console.log('  No .env.local found — using process.env directly\n');
  }
}

// ============================================================
// PROVIDER CONSTANTS
// ============================================================

// Try multiple Moonshot configurations to find the working one.
// Models are ordered from newest/cheapest to oldest — stops at first success.
const MOONSHOT_MODELS = [
  'moonshot-v1-8k',     // Reliable, universally available
  'moonshot-v1-32k',
  // NOTE: kimi-k2.5 is a thinking model — it only outputs chain-of-thought
  // in reasoning_content and leaves content empty. Not suitable for narrator.
];
const MOONSHOT_ENDPOINTS = [
  'https://api.moonshot.cn/v1/chat/completions',
  'https://api.moonshot.ai/v1/chat/completions',
];

// Build config list: try .cn endpoint first for all models, then .ai
const MOONSHOT_CONFIGS: Array<{ url: string; model: string; label: string }> = [];
for (const url of MOONSHOT_ENDPOINTS) {
  const host = url.includes('.cn') ? 'moonshot.cn' : 'moonshot.ai';
  for (const model of MOONSHOT_MODELS) {
    MOONSHOT_CONFIGS.push({ url, model, label: `${host} / ${model}` });
  }
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = [
  'gemini-2.5-flash',          // Gemini 2.5 Flash (newest)
  'gemini-2.5-flash-preview-04-17', // Preview variant
  'gemini-2.0-flash',          // Gemini 2.0 Flash (stable)
  'gemini-1.5-flash',          // Gemini 1.5 Flash (widely available)
];

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929';

// ============================================================
// SAMPLE PROMPT
// ============================================================

const SYSTEM_MESSAGE = `You are Andy Adams, author of "The Log of a Cowboy" (1903).
Write a single diary entry (80–150 words) about a day on the trail.
Use paratactic prose — short declarative sentences, minimal adjectives,
compound with "and," not subordination. Period-accurate nouns only.
No anachronisms. First person, past tense. No headers or titles.`;

const USER_CONTENT = `Event: Day 12 on the Goodnight-Loving Trail.
Biome: Staked Plains. Weather: Clear and hot.
Distance traveled: 18 miles. Water remaining: 42 gallons.
Food remaining: 31 days. Morale: Steady.
Horse alive: yes. Companions: none.
Equipment: boots worn (durability 55), rifle good (88).
Dominant event: RoutineTravel.
Write the diary entry now.`;

// ============================================================
// PROVIDER CALLERS
// ============================================================

async function testMoonshot(): Promise<void> {
  const key = process.env.MOONSHOT_API_KEY;
  if (!key || key === 'sk-...') {
    console.log('[Moonshot] SKIPPED — no MOONSHOT_API_KEY set\n');
    return;
  }

  let anySucceeded = false;
  for (const cfg of MOONSHOT_CONFIGS) {
    process.stdout.write(`[Moonshot] Trying ${cfg.label}... `);
    const start = Date.now();

    const response = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          { role: 'user', content: USER_CONTENT },
        ],
      }),
    });

    const latency = Date.now() - start;

    if (!response.ok) {
      const err = await response.text();
      const parsed = JSON.parse(err).error?.message || err;
      console.log(`FAIL ${response.status} — ${parsed}`);
      continue;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};

    // If text is empty despite success, dump raw response to diagnose
    if (!text) {
      console.log(`OK but EMPTY — ${latency}ms. Raw response:`);
      console.log('  ' + JSON.stringify(data).slice(0, 600) + '\n');
      continue; // try next config
    }

    anySucceeded = true;
    console.log(`OK — ${latency}ms`);
    console.log(`  Tokens: ${usage.prompt_tokens || 0} in / ${usage.completion_tokens || 0} out`);
    console.log(`  Response:\n${indent(text)}\n`);
    console.log(`  *** Working config: url=${cfg.url}, model=${cfg.model} ***\n`);
    break; // stop after first success
  }

  if (!anySucceeded) {
    console.log('[Moonshot] All configs failed. Check your API key.\n');
  }
}

async function testGemini(): Promise<void> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'AI...') {
    console.log('[Gemini] SKIPPED — no GEMINI_API_KEY set\n');
    return;
  }

  let anySucceeded = false;
  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${key}`;
    process.stdout.write(`[Gemini] Trying ${model}... `);
    const start = Date.now();

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_MESSAGE }] },
        contents: [{ role: 'user', parts: [{ text: USER_CONTENT }] }],
        generationConfig: { maxOutputTokens: 300 },
      }),
    });

    const latency = Date.now() - start;

    if (!response.ok) {
      const err = await response.text();
      let msg: string;
      try { msg = JSON.parse(err).error?.message || err; } catch { msg = err; }
      console.log(`FAIL ${response.status} — ${msg}`);
      continue;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';
    const finishReason = candidate?.finishReason || 'unknown';
    const usage = data.usageMetadata || {};

    if (!text) {
      console.log(`OK but EMPTY (finishReason=${finishReason}). Raw: ${JSON.stringify(data).slice(0, 400)}`);
      continue;
    }

    if (finishReason === 'MAX_TOKENS' && (usage.candidatesTokenCount || 0) < 20) {
      console.log(`OK but hit MAX_TOKENS at only ${usage.candidatesTokenCount} tokens — model may not support maxOutputTokens`);
      continue;
    }

    anySucceeded = true;
    console.log(`OK — ${latency}ms (finishReason=${finishReason})`);
    console.log(`  Tokens: ${usage.promptTokenCount || 0} in / ${usage.candidatesTokenCount || 0} out`);
    console.log(`  Response:\n${indent(text)}\n`);
    console.log(`  *** Working model: ${model} ***\n`);
    break;
  }

  if (!anySucceeded) {
    console.log('[Gemini] All models failed or returned empty/truncated output.\n');
  }
}

async function testAnthropic(): Promise<void> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === 'sk-ant-...') {
    console.log('[Anthropic] SKIPPED — no ANTHROPIC_API_KEY set\n');
    return;
  }

  console.log('[Anthropic] Calling claude-sonnet-4-5...');
  const start = Date.now();

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      system: SYSTEM_MESSAGE,
      messages: [{ role: 'user', content: USER_CONTENT }],
    }),
  });

  const latency = Date.now() - start;

  if (!response.ok) {
    const err = await response.text();
    console.error(`[Anthropic] ERROR ${response.status}: ${err}\n`);
    return;
  }

  const data = await response.json();
  const text =
    data.content
      ?.filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n') || '(empty)';
  const usage = data.usage || {};

  console.log(`[Anthropic] OK — ${latency}ms`);
  console.log(`  Tokens: ${usage.input_tokens || 0} in / ${usage.output_tokens || 0} out`);
  console.log(`  Response:\n${indent(text)}\n`);
}

// ============================================================
// HELPERS
// ============================================================

function indent(text: string): string {
  return text
    .trim()
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n');
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log('=== Frontier Narrator API Test ===\n');
  loadEnvLocal();

  await testMoonshot();
  await testGemini();
  await testAnthropic();

  console.log('=== Done ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
