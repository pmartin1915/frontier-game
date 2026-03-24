import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import type { IncomingMessage } from 'http';

// ---------------------------------------------------------------------------
// Types mirrored from api/narrator.ts (can't import — excluded from tsconfig)
// ---------------------------------------------------------------------------
interface NarratorPrompt {
  systemMessage: string;
  voice: string;
  ledgerContext: string;
  characterBibles: string;
  previousEntry: string;
  eventRecord: string;
  gameStateSnapshot: string;
  voiceDirective: string;
  encounterContext: string;
}

interface NarratorApiResponse {
  content: Array<{ type: 'text'; text: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

async function callMoonshot(
  prompt: NarratorPrompt,
  apiKey: string,
): Promise<NarratorApiResponse> {
  const resp = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      messages: [
        { role: 'system', content: prompt.systemMessage },
        { role: 'user', content: assembleXMLUserContent(prompt) },
      ],
      max_tokens: 500,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Moonshot ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  return {
    content: [{ type: 'text', text: data.choices[0].message.content }],
    usage: {
      input_tokens: data.usage?.prompt_tokens,
      output_tokens: data.usage?.completion_tokens,
    },
  };
}

async function callGemini(
  prompt: NarratorPrompt,
  apiKey: string,
): Promise<NarratorApiResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: prompt.systemMessage }] },
      contents: [{ role: 'user', parts: [{ text: assembleXMLUserContent(prompt) }] }],
      generationConfig: { maxOutputTokens: 500 },
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  return {
    content: [{ type: 'text', text: data.candidates[0].content.parts[0].text }],
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount,
      output_tokens: data.usageMetadata?.candidatesTokenCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Anthropic support (ported from api/narrator.ts for dev/prod parity)
// ---------------------------------------------------------------------------

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

const VOICE_CONFIG: Record<string, { temperature: number; maxTokens: number }> = {
  adams:    { temperature: 0.65, maxTokens: 400 },
  irving:   { temperature: 0.75, maxTokens: 600 },
  mcmurtry: { temperature: 0.55, maxTokens: 450 },
};
const VOICE_CONFIG_DEFAULT = { temperature: 0.65, maxTokens: 450 };

/**
 * Assemble user turn as structured XML (matches production api/narrator.ts).
 * XML forces the model to render game state through its voice lens
 * rather than copying input phrasing.
 */
function assembleXMLUserContent(prompt: NarratorPrompt): string {
  const parts: string[] = [];

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

  if (prompt.gameStateSnapshot) {
    parts.push(`<game_state>\n${prompt.gameStateSnapshot}\n</game_state>`);
  }
  if (prompt.eventRecord) {
    parts.push(`<event_record>\n${prompt.eventRecord}\n</event_record>`);
  }
  if (prompt.voiceDirective) {
    parts.push(`<voice_directive>\n${prompt.voiceDirective}\n</voice_directive>`);
  }
  if (prompt.encounterContext) {
    parts.push(`<encounter_context>\n${prompt.encounterContext}\n</encounter_context>`);
  }

  parts.push(`<generation_request>
Write the journal entry now. Output only the prose — no headers, no labels, no game mechanics.
</generation_request>`);

  return parts.join('\n\n');
}

async function callAnthropic(
  prompt: NarratorPrompt,
  apiKey: string,
): Promise<NarratorApiResponse> {
  const voiceCfg = VOICE_CONFIG[prompt.voice || ''] ?? VOICE_CONFIG_DEFAULT;

  const resp = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
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

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return {
    content: data.content,
    usage: data.usage
      ? {
          input_tokens: data.usage.input_tokens,
          output_tokens: data.usage.output_tokens,
          cache_read_input_tokens: data.usage.cache_read_input_tokens,
          cache_creation_input_tokens: data.usage.cache_creation_input_tokens,
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Agent bridge state cache (in-memory, dev only)
// ---------------------------------------------------------------------------

/** Latest game state snapshot POSTed by the browser. */
let agentStateCache: unknown = null;
/** Pending commands queued by external AI agents. Consumed FIFO by the browser. */
const agentCommandQueue: unknown[] = [];

// ---------------------------------------------------------------------------
// Vite config
// ---------------------------------------------------------------------------

export default defineConfig(({ mode }) => {
  // '' prefix exposes ALL .env vars, not just VITE_* ones
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),

      // ------------------------------------------------------------------
      // Dev-only: AI agent bridge
      //
      // External AI tools (Claude CLI, Cline, scripts) can observe game
      // state and queue commands without touching the browser directly.
      //
      // Browser → Server:  POST /api/agent/state   (game state snapshot)
      // Server  → Claude:  GET  /api/agent/state   (read latest snapshot)
      //                    GET  /api/agent/summary  (readable text summary)
      // Claude  → Server:  POST /api/agent/command  (queue an action)
      // Server  → Browser: GET  /api/agent/command  (browser polls + executes)
      // ------------------------------------------------------------------
      {
        name: 'agent-bridge',
        configureServer(server) {
          // CORS headers for all agent endpoints
          const agentCors = (res: import('http').ServerResponse) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
          };

          server.middlewares.use('/api/agent', async (req, res) => {
            agentCors(res);

            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.end();
              return;
            }

            const url = req.url ?? '/';

            // POST /api/agent/state — browser pushes current game state
            if (url === '/state' && req.method === 'POST') {
              const body = await readBody(req);
              try { agentStateCache = JSON.parse(body); } catch { /* ignore */ }
              res.statusCode = 204;
              res.end();
              return;
            }

            // GET /api/agent/state — external agent reads latest state
            if (url === '/state' && req.method === 'GET') {
              res.end(JSON.stringify(agentStateCache ?? {}));
              return;
            }

            // GET /api/agent/summary — human-readable state digest
            if (url === '/summary' && req.method === 'GET') {
              const s = agentStateCache as Record<string, unknown> | null;
              if (!s) { res.end(JSON.stringify({ summary: 'No state received yet. Is the game running?' })); return; }
              const j = (s.journey as Record<string, unknown>) ?? {};
              const p = (s.player as Record<string, unknown>) ?? {};
              const h = (s.horse as Record<string, unknown>) ?? {};
              const sup = (s.supplies as Record<string, unknown>) ?? {};
              const summary = [
                `Day ${j.daysElapsed ?? '?'} | Phase: ${(s as { dailyCyclePhase?: string }).dailyCyclePhase ?? '?'}`,
                `Player: HP=${p.health ?? '?'} Morale=${p.morale ?? '?'} Fatigue=${p.fatigue ?? '?'}`,
                `Horse:  HP=${h.health ?? '?'} Fatigue=${h.fatigue ?? '?'}`,
                `Supplies: Water=${sup.water ?? '?'} Food=${sup.food ?? '?'} Ammo=${sup.ammo ?? '?'}`,
                `Miles: ${((s.world as Record<string, unknown>)?.totalMiles ?? '?')} | Waypoint: ${j.waypoint ?? '?'}`,
                `AutoPlay: ${(s as { autoPlay?: boolean }).autoPlay ? 'ON' : 'OFF'}`,
              ].join('\n');
              res.end(JSON.stringify({ summary }));
              return;
            }

            // POST /api/agent/command — external agent queues a command
            if (url === '/command' && req.method === 'POST') {
              const body = await readBody(req);
              try {
                const cmd = JSON.parse(body);
                agentCommandQueue.push(cmd);
                res.end(JSON.stringify({ queued: true, queueLength: agentCommandQueue.length }));
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
              }
              return;
            }

            // GET /api/agent/command — browser polls and consumes next command
            if (url === '/command' && req.method === 'GET') {
              const cmd = agentCommandQueue.shift() ?? null;
              res.end(JSON.stringify({ command: cmd }));
              return;
            }

            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
          });
        },
      },

      // ------------------------------------------------------------------
      // Dev-only: narrator LLM proxy
      // NOTE: This plugin only runs during `npm run dev`. Production builds
      // use the Vercel serverless function in api/narrator.ts — API keys
      // are never bundled into the client.
      // ------------------------------------------------------------------
      {
        name: 'narrator-dev-proxy',
        configureServer(server) {
          server.middlewares.use('/api/narrator', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method Not Allowed');
              return;
            }
            try {
              const body = await readBody(req);
              const { prompt, provider = 'moonshot' } = JSON.parse(body) as {
                prompt: NarratorPrompt;
                provider?: string;
              };

              let result: NarratorApiResponse;
              if (provider === 'anthropic') {
                result = await callAnthropic(prompt, env.ANTHROPIC_API_KEY);
              } else if (provider === 'gemini') {
                result = await callGemini(prompt, env.GEMINI_API_KEY);
              } else {
                result = await callMoonshot(prompt, env.MOONSHOT_API_KEY);
              }

              const text = result.content?.[0]?.text || '';
              console.log(`[narrator-dev-proxy] ${provider} → ${text.length} chars, ${result.usage?.output_tokens ?? '?'} tokens`);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (e) {
              console.error('[narrator-dev-proxy]', e);
              res.statusCode = 502;
              res.end(JSON.stringify({ error: 'Narrator API error' }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    test: {
      globals: true,
      environment: 'node',
      exclude: ['e2e/**', 'node_modules/**'],
    },
    server: {
      port: 3000,
      open: true,
    },
    build: {
      target: 'es2022',
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ['phaser'],
            react: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
