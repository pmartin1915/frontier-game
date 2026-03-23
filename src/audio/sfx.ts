/**
 * Frontier — Synthesized Sound Effects
 *
 * All SFX are generated in real-time with the Web Audio API.
 * No audio files are required. Each SfxEvent has a distinct
 * oscillator/envelope profile suited to its game context.
 *
 * This module is a silent no-op in Node.js / Vitest environments
 * where AudioContext is not available.
 */

import { SfxEvent } from '@/types/audio';

// ---- Web Audio context (lazy, shared) ----

let _ctx: AudioContext | null = null;

/**
 * Called once from initAudio() on the first user gesture (click/keydown).
 * Creates and unlocks the AudioContext synchronously inside the gesture handler,
 * satisfying the browser autoplay policy before any game-driven SFX fires.
 */
export function unlockAudio(): void {
  if (typeof AudioContext === 'undefined') return;
  if (_ctx) {
    // Context already exists — just resume if suspended.
    if (_ctx.state === 'suspended') void _ctx.resume();
    return;
  }
  _ctx = new AudioContext();
  if (_ctx.state === 'suspended') void _ctx.resume();
}

function getCtx(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  // Fallback: create context lazily if unlockAudio() was never called.
  if (!_ctx) {
    _ctx = new AudioContext();
    if (import.meta.env.DEV) {
      console.warn('[audio/sfx] AudioContext created lazily — unlockAudio() should be called first on a user gesture.');
    }
  }
  if (_ctx.state === 'suspended') void _ctx.resume();
  return _ctx;
}

// ---- Cached noise buffer (avoids GC on every click) ----

/** ~0.5 s of white noise sampled at context rate; created once and reused. */
let _noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  // Invalidate if context has changed (e.g. after browser AudioContext recreation).
  if (_noiseBuffer && _noiseBuffer.sampleRate === ctx.sampleRate) {
    return _noiseBuffer;
  }
  const n    = Math.floor(ctx.sampleRate * 0.5);
  const buf  = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1);
  _noiseBuffer = buf;
  return buf;
}

// ---- Low-level audio primitives ----

/**
 * Play a single oscillator tone with linear fade-in / fade-out.
 * @param freq      Frequency in Hz
 * @param duration  Duration in seconds
 * @param volume    Peak gain (0–1)
 * @param type      OscillatorType ('sine' | 'square' | 'sawtooth' | 'triangle')
 * @param delay     Start delay relative to ctx.currentTime (seconds)
 */
function tone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  delay = 0,
): void {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  const t0   = ctx.currentTime + delay;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.setValueAtTime(volume, t0 + Math.max(0.016, duration - 0.05));
  gain.gain.linearRampToValueAtTime(0, t0 + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.01);
}

/** Play a frequency-sweeping oscillator (for descending/rising effects). */
function sweepTone(
  ctx: AudioContext,
  freqStart: number,
  freqEnd: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sawtooth',
): void {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  const t0   = ctx.currentTime;

  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, t0);
  osc.frequency.linearRampToValueAtTime(freqEnd, t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.linearRampToValueAtTime(0, t0 + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.01);
}

/** Burst of white noise (for click/percussive sounds). Uses cached buffer. */
function noise(ctx: AudioContext, duration: number, volume: number): void {
  const buf  = getNoiseBuffer(ctx);
  const src  = ctx.createBufferSource();
  const gain = ctx.createGain();

  src.buffer = buf;
  // Trim playback to the requested duration (buffer may be longer).
  src.loop = false;

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + Math.min(duration, buf.duration));

  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  src.stop(ctx.currentTime + Math.min(duration, buf.duration));
}

// ---- Individual SFX implementations ----

function sfxClick(ctx: AudioContext, v: number): void {
  noise(ctx, 0.04, v * 0.1);
}

function sfxConfirm(ctx: AudioContext, v: number): void {
  tone(ctx, 440, 0.12, v * 0.45);
  tone(ctx, 660, 0.14, v * 0.35, 'sine', 0.10);
}

function sfxEncounter(ctx: AudioContext, v: number): void {
  tone(ctx, 280, 0.07, v * 0.65, 'sawtooth');
  tone(ctx, 420, 0.30, v * 0.45, 'square', 0.07);
  noise(ctx, 0.05, v * 0.15);
}

function sfxChoiceSelect(ctx: AudioContext, v: number): void {
  tone(ctx, 528, 0.09, v * 0.30, 'sine');
}

function sfxOutcome(ctx: AudioContext, v: number): void {
  // Major triad arpeggio — C4, E4, G4
  tone(ctx, 261, 0.14, v * 0.4);
  tone(ctx, 329, 0.14, v * 0.4, 'sine', 0.12);
  tone(ctx, 392, 0.20, v * 0.5, 'sine', 0.24);
}

function sfxOutcomeBad(ctx: AudioContext, v: number): void {
  sweepTone(ctx, 420, 180, 0.55, v * 0.40);
}

function sfxWaypoint(ctx: AudioContext, v: number): void {
  // Ascending triad: C5, E5, G5
  tone(ctx, 523, 0.14, v * 0.50);
  tone(ctx, 659, 0.14, v * 0.50, 'sine', 0.13);
  tone(ctx, 784, 0.24, v * 0.60, 'sine', 0.26);
}

function sfxCampStart(ctx: AudioContext, v: number): void {
  // Warm low chord — A2 + E3
  tone(ctx, 110, 0.90, v * 0.25, 'sine');
  tone(ctx, 165, 0.80, v * 0.15, 'sine', 0.06);
  tone(ctx, 220, 0.60, v * 0.10, 'sine', 0.12);
}

function sfxGameOver(ctx: AudioContext, v: number): void {
  // Slow descending minor: E4 -> Eb4 -> B3 -> A3
  [330, 311, 247, 220].forEach((f, i) =>
    tone(ctx, f, 0.55, v * 0.40, 'sine', i * 0.50),
  );
}

function sfxVictory(ctx: AudioContext, v: number): void {
  // Ascending scale then held high note
  [261, 329, 392, 523, 659, 784].forEach((f, i) =>
    tone(ctx, f, 0.18, v * 0.50, 'sine', i * 0.11),
  );
  tone(ctx, 1047, 0.70, v * 0.55, 'sine', 0.72);
}

// ---- Dispatch table ----

const SFX_MAP: Record<SfxEvent, (ctx: AudioContext, v: number) => void> = {
  [SfxEvent.Click]:        sfxClick,
  [SfxEvent.Confirm]:      sfxConfirm,
  [SfxEvent.Encounter]:    sfxEncounter,
  [SfxEvent.ChoiceSelect]: sfxChoiceSelect,
  [SfxEvent.Outcome]:      sfxOutcome,
  [SfxEvent.OutcomeBad]:   sfxOutcomeBad,
  [SfxEvent.Waypoint]:     sfxWaypoint,
  [SfxEvent.CampStart]:    sfxCampStart,
  [SfxEvent.GameOver]:     sfxGameOver,
  [SfxEvent.Victory]:      sfxVictory,
};

// ---- Public API ----

/**
 * Play a synthesized sound effect at the given volume (0–1).
 * No-op in environments without AudioContext (SSR, tests).
 */
export function playSfxEvent(event: SfxEvent, volume = 1): void {
  const ctx = getCtx();
  if (!ctx) return;
  const fn = SFX_MAP[event];
  if (fn) {
    fn(ctx, Math.max(0, Math.min(1, volume)));
  } else if (import.meta.env.DEV) {
    console.warn(`[audio/sfx] No handler for SfxEvent: ${event}`);
  }
}
