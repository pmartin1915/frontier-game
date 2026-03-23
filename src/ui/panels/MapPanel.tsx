/**
 * Frontier — Map Panel (Living Map)
 *
 * SVG trail map showing the Goodnight-Loving Trail from Fort Belknap to Denver.
 * Styled as an aged 1870s illustrated map, reactive to weather, time-of-day,
 * fog-of-war progression, and journey state.
 *
 * 18-layer SVG stack (bottom to top):
 *  1  Parchment base (feTurbulence grain)
 *  2  Vignette (radialGradient dark edges)
 *  3  Biome fill zones
 *  4  Terrain illustration (rivers, mountains, forest glyphs)
 *  5  Trail shadow
 *  6  Full trail path (cubic bezier)
 *  7  Explored trail (gold highlight polyline)
 *  8  Act boundary ticks + Roman numerals
 *  9  Compass rose
 * 10  Weather particles (CSS-animated)
 * 11  Waypoint icons + labels
 * 12  Fog of war overlay (masked semi-transparent tint)
 * 13  Wagon wheel player token
 * 14  Time-of-day tint rect
 * 15  Day/night arc indicator
 * 16  Decorative border frame
 * 17  Miles remaining label
 *
 * Imports: types/, store/, data/ (static constants only).
 */

import React, { useMemo } from 'react';
import { useStore } from '@/store';
import {
  selectTotalMiles,
  selectWaypoint,
  selectCurrentAct,
  selectBiome,
  selectTimeOfDay,
  selectWeather,
} from '@/store/selectors';
import { TRAIL_WAYPOINTS, TOTAL_TRAIL_MILES } from '@/data/trail-route';
import { Act, TimeOfDay } from '@/types/game-state';
import { colors } from '@/ui/theme';

import {
  toSvg,
  buildTrailPath,
  buildTraveledPoints,
  getPlayerPosition,
  computeFogRadius,
  isWaypointRevealed,
  TOD_ARC_ANGLE,
  TOD_OVERLAY,
} from './map-panel-utils';
import { BiomeFillZones, TerrainIllustration, CompassRose, DecorativeBorder } from './map-panel-layers';
import { WaypointMarker } from './map-panel-icons';
import { WeatherParticles } from './map-panel-particles';

// ============================================================
// CONSTANTS
// ============================================================

const ACT_LABELS: Record<Act, string> = {
  [Act.I]: 'I',
  [Act.II]: 'II',
  [Act.III]: 'III',
  [Act.IV]: 'IV',
  [Act.V]: 'V',
};

/** Precompute the smooth bezier path — never changes */
const TRAIL_BEZIER_PATH = buildTrailPath(TRAIL_WAYPOINTS);

/** Act boundary waypoints (where act transitions occur) */
const ACT_BOUNDARIES = TRAIL_WAYPOINTS.slice(1)
  .filter((wp, i) => wp.act !== TRAIL_WAYPOINTS[i].act)
  .map((wp) => ({ wp, pos: toSvg(wp.mapPosition) }));

// ============================================================
// COMPONENT
// ============================================================

export default function MapPanel() {
  const miles   = useStore(selectTotalMiles);
  const waypoint = useStore(selectWaypoint);
  const act     = useStore(selectCurrentAct);
  const biome   = useStore(selectBiome);
  const tod     = useStore(selectTimeOfDay);
  const weather = useStore(selectWeather);

  const playerPos  = getPlayerPosition(miles, TRAIL_WAYPOINTS);
  const fogRadius  = computeFogRadius(miles);
  const todOverlay = TOD_OVERLAY[tod];
  const arcAngle   = TOD_ARC_ANGLE[tod];
  const isNight    = arcAngle === -1;

  // Sun/moon position on the arc
  const arcRad  = (arcAngle * Math.PI) / 180;
  const arcR    = 13;
  const sunX    = isNight ? 0 : (Math.cos(arcRad) * arcR);
  const sunY    = isNight ? 11 : -(Math.sin(arcRad) * arcR);

  // Traveled trail polyline points
  const traveledPoints = useMemo(
    () => buildTraveledPoints(miles, TRAIL_WAYPOINTS),
    [miles],
  );

  // Static terrain — memoized once
  const terrain     = useMemo(() => <TerrainIllustration />, []);
  const compassRose = useMemo(() => <CompassRose />, []);
  const border      = useMemo(() => <DecorativeBorder />, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.label}>Trail Map</div>
        <div style={styles.info}>
          <span>{Math.round(miles)} mi</span>
          <span style={styles.separator}>&middot;</span>
          <span>{waypoint}</span>
          <span style={styles.separator}>&middot;</span>
          <span>{act.replace('act', 'Act ')}</span>
        </div>
      </div>

      <div style={styles.mapContainer}>
        <svg
          viewBox="0 0 420 270"
          style={styles.svg}
          data-testid="map-panel"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ──────────────────────────────────────────────────────
              DEFS — filters, gradients, masks, clip paths
          ────────────────────────────────────────────────────── */}
          <defs>
            {/* Parchment grain — applied only to background rect */}
            <filter id="parchment-filter" x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.65"
                numOctaves="3"
                stitchTiles="stitch"
                result="noise"
              />
              <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
              <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" result="blended" />
              <feComponentTransfer in="blended">
                <feFuncR type="linear" slope="0.94" intercept="0.06" />
                <feFuncG type="linear" slope="0.91" intercept="0.05" />
                <feFuncB type="linear" slope="0.86" intercept="0.04" />
              </feComponentTransfer>
            </filter>

            {/* Vignette gradient */}
            <radialGradient id="vignette-gradient" cx="50%" cy="50%" r="72%" fx="50%" fy="50%">
              <stop offset="35%" stopColor="transparent" stopOpacity="0" />
              <stop offset="100%" stopColor="#2a1c10" stopOpacity="0.42" />
            </radialGradient>

            {/* Fog-edge softener (applied to reveal circles inside mask) */}
            <filter id="fog-edge-blur" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
            </filter>

            {/* Clip path to prevent particles overflowing the viewBox */}
            <clipPath id="map-clip">
              <rect x="0" y="0" width="420" height="270" />
            </clipPath>

            {/* Fog of war mask */}
            <mask id="fog-mask">
              {/* Start fully dark */}
              <rect width="420" height="270" fill="black" />
              {/* Soft reveal zone around player + Fort Belknap start */}
              <g filter="url(#fog-edge-blur)">
                {/* Fort Belknap always fully visible */}
                <circle cx="350" cy="235" r="32" fill="white" />
                {/* Expanding reveal around player position */}
                <circle
                  cx={playerPos.x}
                  cy={playerPos.y}
                  r={fogRadius}
                  fill="white"
                  className="map-fog-reveal"
                />
              </g>
            </mask>
          </defs>

          {/* ── LAYER 1: Parchment base ──────────────────────── */}
          <rect
            x="0" y="0" width="420" height="270"
            fill="#f5f0e8"
            filter="url(#parchment-filter)"
          />

          {/* ── LAYER 2: Vignette ────────────────────────────── */}
          <rect
            x="0" y="0" width="420" height="270"
            fill="url(#vignette-gradient)"
            className="map-no-pointer"
          />

          {/* ── LAYER 3: Biome fill zones ────────────────────── */}
          <BiomeFillZones currentBiome={biome} />

          {/* ── LAYER 4: Terrain illustration ────────────────── */}
          {terrain}

          {/* ── LAYER 5: Trail shadow ────────────────────────── */}
          <path
            d={TRAIL_BEZIER_PATH}
            fill="none"
            stroke="#3a2008"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.22"
            transform="translate(1.5, 2)"
          />

          {/* ── LAYER 6: Full trail path ─────────────────────── */}
          <path
            d={TRAIL_BEZIER_PATH}
            fill="none"
            stroke={colors.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.60"
          />

          {/* ── LAYER 7: Explored (traveled) trail ───────────── */}
          {miles > 0 && traveledPoints.length > 0 && (
            <polyline
              points={traveledPoints}
              fill="none"
              stroke={colors.mapAccent}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.90"
            />
          )}

          {/* ── LAYER 8: Act boundary markers ────────────────── */}
          {ACT_BOUNDARIES.map(({ wp, pos }) => (
            <g key={`act-${wp.id}`}>
              {/* Short perpendicular tick */}
              <line
                x1={pos.x - 5} y1={pos.y + 5}
                x2={pos.x + 5} y2={pos.y - 5}
                stroke={colors.secondary}
                strokeWidth="1.2"
                opacity="0.65"
              />
              <text
                x={pos.x + 8}
                y={pos.y - 8}
                fontSize="7"
                fill={colors.primary}
                fontFamily="'Crimson Text', Georgia, serif"
                textAnchor="start"
                opacity="0.55"
              >
                {ACT_LABELS[wp.act]}
              </text>
            </g>
          ))}

          {/* ── LAYER 9: Compass rose ────────────────────────── */}
          {compassRose}

          {/* ── LAYER 10: Weather particles ──────────────────── */}
          <g clipPath="url(#map-clip)">
            <WeatherParticles weather={weather} />
          </g>

          {/* ── LAYER 11: Waypoint icons + labels ────────────── */}
          {TRAIL_WAYPOINTS.map((wp) => {
            const visited  = wp.cumulativeMiles <= miles;
            const revealed = isWaypointRevealed(wp, playerPos, fogRadius);
            return (
              <WaypointMarker
                key={wp.id}
                wp={wp}
                visited={visited}
                revealed={revealed}
              />
            );
          })}

          {/* ── LAYER 12: Fog of war overlay ─────────────────── */}
          <rect
            x="0" y="0" width="420" height="270"
            fill="rgba(42, 28, 16, 0.33)"
            mask="url(#fog-mask)"
            className="map-fog-pulse"
          />

          {/* ── LAYER 13: Wagon wheel player token ───────────── */}
          <WagonWheelToken playerPos={playerPos} />

          {/* ── LAYER 14: Time-of-day tint overlay ───────────── */}
          <rect
            x="0" y="0" width="420" height="270"
            fill={todOverlay.fill}
            opacity={todOverlay.opacity}
            className="map-tod-rect map-no-pointer"
          />

          {/* ── LAYER 15: Day/night arc indicator (upper-right) ─ */}
          <DayNightIndicator
            arcR={arcR}
            sunX={sunX}
            sunY={sunY}
            isNight={isNight}
            tod={tod}
          />

          {/* ── LAYER 16: Decorative border frame ────────────── */}
          {border}

          {/* ── LAYER 17: Miles remaining label ──────────────── */}
          <text
            x="412"
            y="263"
            fontSize="7.5"
            fill={colors.textMuted}
            fontFamily="'Crimson Text', Georgia, serif"
            textAnchor="end"
            opacity="0.70"
          >
            {Math.round(TOTAL_TRAIL_MILES - miles)} mi remaining
          </text>
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// WAGON WHEEL PLAYER TOKEN
// ============================================================

const SPOKE_ANGLES = [0, 60, 120, 180, 240, 300];

function WagonWheelToken({
  playerPos,
}: {
  playerPos: { x: number; y: number };
}) {
  return (
    <g
      data-testid="player-token"
      className="map-wagon-wheel"
      style={{ transform: `translate(${playerPos.x.toFixed(1)}px, ${playerPos.y.toFixed(1)}px)` }}
    >
      {/* Outer glow halo */}
      <circle r="10" fill="none" stroke="#D4A017" strokeWidth="1.5" opacity="0.4">
        <animate attributeName="opacity" values="0.2;0.65;0.2" dur="2.8s" repeatCount="indefinite" />
      </circle>

      {/* Wheel rim */}
      <circle r="6.5" fill="none" stroke="#5B3A29" strokeWidth="1.6" />

      {/* Spokes */}
      {SPOKE_ANGLES.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={(Math.cos(rad) * 1.5).toFixed(2)}
            y1={(Math.sin(rad) * 1.5).toFixed(2)}
            x2={(Math.cos(rad) * 6.0).toFixed(2)}
            y2={(Math.sin(rad) * 6.0).toFixed(2)}
            stroke="#5B3A29"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        );
      })}

      {/* Hub */}
      <circle r="1.8" fill="#5B3A29" />
    </g>
  );
}

// ============================================================
// DAY / NIGHT ARC INDICATOR
// ============================================================

function DayNightIndicator({
  arcR,
  sunX,
  sunY,
  isNight,
  tod,
}: {
  arcR: number;
  sunX: number;
  sunY: number;
  isNight: boolean;
  tod: TimeOfDay;
}) {
  const todLabel: Record<TimeOfDay, string> = {
    [TimeOfDay.Dawn]:      'Dawn',
    [TimeOfDay.Morning]:   'Morning',
    [TimeOfDay.Midday]:    'Noon',
    [TimeOfDay.Afternoon]: 'Afternoon',
    [TimeOfDay.Sunset]:    'Dusk',
    [TimeOfDay.Night]:     'Night',
  };

  return (
    <g transform="translate(400, 22)" opacity="0.80">
      {/* Arc (semicircle above horizon) */}
      <path
        d={`M -${arcR},0 A ${arcR},${arcR} 0 0 1 ${arcR},0`}
        fill="none"
        stroke="#c4b08b"
        strokeWidth="1.1"
        opacity="0.55"
      />
      {/* Horizon line */}
      <line
        x1={-(arcR + 2)} y1="0"
        x2={arcR + 2}   y2="0"
        stroke="#8b7355"
        strokeWidth="0.8"
        opacity="0.50"
      />

      {/* Celestial body (sun or moon) */}
      {isNight ? (
        /* Moon: off-center circle + clipping circle for crescent */
        <g>
          <circle cx={sunX} cy={sunY} r="2.8" fill="#e0d8b0" />
          <circle cx={sunX + 1.6} cy={sunY} r="2.2" fill="#c4b08b" />
        </g>
      ) : (
        <circle
          cx={sunX.toFixed(1)}
          cy={sunY.toFixed(1)}
          r="3"
          fill="#f0b820"
          opacity="0.90"
        >
          <animate
            attributeName="opacity"
            values="0.75;1.0;0.75"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Time label */}
      <text
        x="0"
        y="10"
        textAnchor="middle"
        fontSize="5.5"
        fontFamily="'Crimson Text', Georgia, serif"
        fill="#8b7355"
        fontStyle="italic"
        style={{ transition: 'opacity 0.5s' }}
      >
        {todLabel[tod]}
      </text>
    </g>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: "'Crimson Text', Georgia, serif",
  },
  header: {
    padding: '0 0 4px 0',
    flexShrink: 0,
  },
  label: {
    fontSize: '12px',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  info: {
    fontSize: '13px',
    color: colors.text,
  },
  separator: {
    margin: '0 6px',
    color: colors.secondary,
  },
  mapContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
  },
  svg: {
    width: '100%',
    height: '100%',
    maxHeight: '270px',
    overflow: 'visible',
  },
};
