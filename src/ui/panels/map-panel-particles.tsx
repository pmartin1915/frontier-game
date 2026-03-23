/**
 * Frontier — Map Panel Weather Particles
 *
 * CSS-animated weather effects for the living map.
 * Animation timing is passed as CSS custom properties (--dur, --delay)
 * and consumed by @keyframe classes in frontier-theme.css.
 * No requestAnimationFrame, no setInterval, no JS per-frame work.
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Weather } from '@/types/game-state';
import { generateWeatherParticles } from './map-panel-utils';
import type { ParticleDescriptor } from './map-panel-utils';

// CSS custom-property style (only vars, no property names) — linter-safe
type VarStyle = { '--dur': string; '--delay': string } & CSSProperties;

function particleVars(p: ParticleDescriptor): VarStyle {
  return { '--dur': p.dur, '--delay': p.delay } as VarStyle;
}

// ============================================================
// PARTICLE RENDERERS
// ============================================================

function RainParticle({ p, storm }: { p: ParticleDescriptor; storm?: boolean }) {
  return (
    <line
      x1={p.x} y1={p.y}
      x2={p.x} y2={p.y + (p.len ?? 8)}
      stroke={storm ? 'rgba(80,120,180,0.55)' : 'rgba(100,140,200,0.55)'}
      strokeWidth={storm ? 1.2 : 0.9}
      strokeLinecap="round"
      className={p.className}
      style={particleVars(p)}
    />
  );
}

function SnowParticle({ p }: { p: ParticleDescriptor }) {
  return (
    <circle
      cx={p.x} cy={p.y}
      r={p.r ?? 2}
      fill="rgba(240,245,255,0.82)"
      className={p.className}
      style={particleVars(p)}
    />
  );
}

function DustParticle({ p }: { p: ParticleDescriptor }) {
  return (
    <ellipse
      cx={p.x} cy={p.y}
      rx={p.rx ?? 12} ry={p.ry ?? 3}
      fill="rgba(196,168,104,0.28)"
      className={p.className}
      style={particleVars(p)}
    />
  );
}

function HeatParticle({ p }: { p: ParticleDescriptor }) {
  return (
    <path
      d={`M 10,${p.y} Q 105,${p.y - 3} 210,${p.y} Q 315,${p.y + 3} 410,${p.y}`}
      fill="none"
      stroke="rgba(210,130,30,0.14)"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={p.className}
      style={particleVars(p)}
    />
  );
}

// ============================================================
// WEATHER PARTICLES (main export)
// ============================================================

export function WeatherParticles({ weather }: { weather: Weather }) {
  const particles = useMemo(
    () => generateWeatherParticles(weather),
    [weather],
  );

  if (particles.length === 0) return null;

  return (
    <g id="weather-particles" className="map-no-pointer">
      {weather === Weather.Rain   && particles.map((p) => <RainParticle key={p.id} p={p} />)}
      {weather === Weather.Storm  && particles.map((p) => <RainParticle key={p.id} p={p} storm />)}
      {weather === Weather.Snow   && particles.map((p) => <SnowParticle key={p.id} p={p} />)}
      {weather === Weather.Dust   && particles.map((p) => <DustParticle key={p.id} p={p} />)}
      {weather === Weather.Heatwave && particles.map((p) => <HeatParticle key={p.id} p={p} />)}
    </g>
  );
}
