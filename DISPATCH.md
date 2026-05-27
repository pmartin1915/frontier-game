# DISPATCH — Frontier Async Task Protocol

When working autonomously (Dispatch, Scheduled Tasks, or Channels), follow these rules.

This is the dispatcher-facing copy. The human-facing copy at the frontier repo root (`../../DISPATCH.md`) is identical except its Pre-Approved Task commands are prefixed with `cd files/frontier-scaffold/frontier && ...` because that copy is read from the project root. This copy lives at the dispatcher's working directory (`config/shared.json` slug `path`) so the prefix is dropped.

## Pre-Approved Tasks (no confirmation needed)

| Task | Command | Notes |
|------|---------|-------|
| `test` | `npm run test:run` | Vitest, all must pass |
| `typecheck` | `npm run typecheck` | tsc --noEmit |
| `lint` | `npm run lint` | ESLint |
| `build` | `npm run build` | tsc + vite build |
| `audit` | Use `mcp__pal__codereview` on changed files | Cross-model review |
| `simulate:quick` | `npm run simulate` | Quick game sim |

## Guided Tasks (plan first, then execute)

| Task | What to do |
|------|-----------|
| `fix <issue>` | Read STATE.md, locate bug, plan fix, implement, test |
| `refactor <area>` | Plan the refactor, check three-layer rule, implement, test |
| `add-tests <area>` | Read existing tests, identify gaps, write new tests |
| `visual-audit` | Run `npm run visual-audit`, compare screenshots |

## Requires Confirmation (never auto-execute)

| Task | Why |
|------|-----|
| `deploy` | Pushes to Vercel production |
| `narrator-prompt` | Changes AI behavior, anachronism risk |
| `three-layer-change` | Architectural boundary modification |
| `delete` | Any file deletion |

## Three-Layer Safety Gate

Before any code change, verify:
- [ ] Game Logic layer has NO imports from narrator.ts
- [ ] Director layer has NO AI/API calls
- [ ] Narrator layer has NO store.setState() calls
- [ ] No Anthropic API keys in client code
- [ ] No post-1866 vocabulary in prompts

## State Files

- Read `ai/STATE.md` before starting work
- Update `ai/STATE.md` after completing work
- Log non-obvious choices in `ai/DECISIONS.md`
