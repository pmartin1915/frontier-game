import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import type { IncomingMessage } from 'http';

// ---------------------------------------------------------------------------
// Types mirrored from api/narrator.ts (can't import — excluded from tsconfig)
// ---------------------------------------------------------------------------
interface NarratorPrompt {
  systemMessage: string;
  ledgerContext: string;
  characterBibles: string;
  previousEntry: string;
  eventRecord: string;
  gameStateSnapshot: string;
  voiceDirective: string;
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

function buildUserText(p: NarratorPrompt): string {
  return [
    p.ledgerContext,
    p.characterBibles,
    p.previousEntry,
    p.eventRecord,
    p.gameStateSnapshot,
    p.voiceDirective,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildMessages(p: NarratorPrompt) {
  return [
    { role: 'system', content: p.systemMessage },
    { role: 'user', content: buildUserText(p) },
  ];
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
      messages: buildMessages(prompt),
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
      contents: [{ role: 'user', parts: [{ text: buildUserText(prompt) }] }],
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
              if (provider === 'gemini') {
                result = await callGemini(prompt, env.GEMINI_API_KEY);
              } else {
                result = await callMoonshot(prompt, env.MOONSHOT_API_KEY);
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (e) {
              console.error('[narrator-dev-proxy]', e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(e) }));
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
