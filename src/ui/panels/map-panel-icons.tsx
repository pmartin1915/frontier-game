/**
 * Frontier — Map Panel Waypoint Icons
 *
 * Per-type SVG icons for trail waypoints. Each icon has two visual states:
 *  - visited:   filled + full opacity
 *  - unvisited: stroke-only + reduced opacity
 *
 * Hover uses native SVG <title> for a zero-JS tooltip showing the landmark description.
 */

import { memo } from 'react';
import { Terrain } from '@/types/game-state';
import type { TrailWaypoint } from '@/data/trail-route';
import { toSvg } from './map-panel-utils';
import { colors } from '@/ui/theme';

// ============================================================
// ICON SUB-COMPONENTS
// ============================================================

/** Fort battlement — used for all settlements */
function SettlementIcon({
  cx, cy, visited,
}: { cx: number; cy: number; visited: boolean }) {
  const fill = visited ? colors.primary : 'none';
  const stroke = colors.primary;
  return (
    <g>
      {/* Main wall */}
      <rect x={cx - 5} y={cy - 3} width={10} height={7}
        fill={fill} stroke={stroke} strokeWidth="1" />
      {/* Battlements (3 notch rects) */}
      <rect x={cx - 4} y={cy - 7} width={2} height={4}
        fill={fill} stroke={stroke} strokeWidth="0.8" />
      <rect x={cx - 1} y={cy - 7} width={2} height={4}
        fill={fill} stroke={stroke} strokeWidth="0.8" />
      <rect x={cx + 2} y={cy - 7} width={2} height={4}
        fill={fill} stroke={stroke} strokeWidth="0.8" />
    </g>
  );
}

/** Two wavy parallel lines — river crossing */
function RiverIcon({
  cx, cy, visited,
}: { cx: number; cy: number; visited: boolean }) {
  const stroke = visited ? '#4a7a9b' : '#7ab0cc';
  const opacity = visited ? 1 : 0.5;
  return (
    <g opacity={opacity}>
      <path
        d={`M ${cx - 5},${cy - 2} Q ${cx},${cy - 4} ${cx + 5},${cy - 2}`}
        fill="none" stroke={stroke} strokeWidth="1.2" strokeLinecap="round"
      />
      <path
        d={`M ${cx - 5},${cy + 2} Q ${cx},${cy + 4} ${cx + 5},${cy + 2}`}
        fill="none" stroke={stroke} strokeWidth="1.2" strokeLinecap="round"
      />
    </g>
  );
}

/** Skull + crossed bones — Horsehead Crossing (historically deadly alkaline water) */
function DesertIcon({
  cx, cy, visited,
}: { cx: number; cy: number; visited: boolean }) {
  const fill = visited ? '#a0845c' : 'none';
  const stroke = '#6b5030';
  const opacity = visited ? 0.85 : 0.45;
  return (
    <g opacity={opacity}>
      {/* Skull circle */}
      <circle cx={cx} cy={cy - 2} r={3.5} fill={fill} stroke={stroke} strokeWidth="0.8" />
      {/* Eye sockets (only when visited/filled) */}
      {visited && (
        <>
          <circle cx={cx - 1.2} cy={cy - 2.5} r={0.8} fill="#6b5030" />
          <circle cx={cx + 1.2} cy={cy - 2.5} r={0.8} fill="#6b5030" />
        </>
      )}
      {/* Crossed bones below */}
      <line x1={cx - 2.5} y1={cy + 2} x2={cx + 2.5} y2={cy + 6} stroke={stroke} strokeWidth="0.9" strokeLinecap="round" />
      <line x1={cx + 2.5} y1={cy + 2} x2={cx - 2.5} y2={cy + 6} stroke={stroke} strokeWidth="0.9" strokeLinecap="round" />
    </g>
  );
}

/** V-notch cross-section — canyon */
function CanyonIcon({
  cx, cy, visited,
}: { cx: number; cy: number; visited: boolean }) {
  const stroke = visited ? '#5B3A29' : '#8b6a50';
  const opacity = visited ? 0.9 : 0.5;
  return (
    <path
      d={`M ${cx - 6},${cy - 4} L ${cx},${cy + 5} L ${cx + 6},${cy - 4}`}
      fill="none"
      stroke={stroke}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}

/** Two-peak mountain silhouette */
function MountainIcon({
  cx, cy, visited,
}: { cx: number; cy: number; visited: boolean }) {
  const fill = visited ? '#6b7b8b' : 'none';
  const stroke = '#4a5a6a';
  const opacity = visited ? 0.9 : 0.5;
  return (
    <polygon
      points={`${cx - 8},${cy + 5} ${cx - 3},${cy - 5} ${cx + 1},${cy + 1} ${cx + 4},${cy - 4} ${cx + 9},${cy + 5}`}
      fill={fill}
      stroke={stroke}
      strokeWidth="0.9"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}

// ============================================================
// LABEL OFFSETS
// ============================================================

const LABEL_OFFSETS: Record<string, { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }> = {
  fort_belknap:       { dx: -8,  dy: 16, anchor: 'end'    },
  middle_concho:      { dx:  8,  dy: -8, anchor: 'start'  },
  horsehead_crossing: { dx:  8,  dy: -8, anchor: 'start'  },
  castle_gap:         { dx: -8,  dy: -8, anchor: 'end'    },
  fort_sumner:        { dx:  9,  dy: 16, anchor: 'start'  },
  santa_fe:           { dx: -8,  dy: -8, anchor: 'end'    },
  raton_pass:         { dx:  8,  dy: -8, anchor: 'start'  },
  trinidad:           { dx:  9,  dy: 16, anchor: 'start'  },
  denver:             { dx:  9,  dy: -8, anchor: 'start'  },
};

// ============================================================
// WAYPOINT MARKER (main export)
// ============================================================

export interface WaypointMarkerProps {
  wp: TrailWaypoint;
  visited: boolean;
  /** Whether the waypoint name label should be fully visible (fog of war) */
  revealed: boolean;
}

export const WaypointMarker = memo(function WaypointMarker({
  wp,
  visited,
  revealed,
}: WaypointMarkerProps) {
  const pos = toSvg(wp.mapPosition);
  const offset = LABEL_OFFSETS[wp.id] ?? { dx: 8, dy: -8, anchor: 'start' as const };
  const labelOpacity = revealed ? (visited ? 1 : 0.55) : 0.15;

  return (
    <g
      id={`waypoint-${wp.id}`}
      role="img"
      aria-label={wp.name}
      className="map-waypoint-marker"
    >
      {/* Native SVG tooltip (hover landmark description) */}
      <title>{wp.name}: {wp.landmark}</title>

      {/* Invisible hit area for easier hover */}
      <circle cx={pos.x} cy={pos.y} r={10} fill="transparent" />

      {/* Per-terrain icon */}
      {wp.terrain === Terrain.Settlement && (
        <SettlementIcon cx={pos.x} cy={pos.y} visited={visited} />
      )}
      {wp.terrain === Terrain.River && (
        <RiverIcon cx={pos.x} cy={pos.y} visited={visited} />
      )}
      {wp.terrain === Terrain.Desert && (
        <DesertIcon cx={pos.x} cy={pos.y} visited={visited} />
      )}
      {wp.terrain === Terrain.Canyon && (
        <CanyonIcon cx={pos.x} cy={pos.y} visited={visited} />
      )}
      {wp.terrain === Terrain.Mountain && (
        <MountainIcon cx={pos.x} cy={pos.y} visited={visited} />
      )}
      {/* Fallback for any unlisted terrain type */}
      {![Terrain.Settlement, Terrain.River, Terrain.Desert, Terrain.Canyon, Terrain.Mountain].includes(wp.terrain) && (
        <circle
          cx={pos.x} cy={pos.y}
          r={visited ? 3.5 : 3}
          fill={visited ? colors.primary : 'none'}
          stroke={colors.primary}
          strokeWidth="1.2"
        />
      )}

      {/* Waypoint name label */}
      <text
        x={pos.x + offset.dx}
        y={pos.y + offset.dy}
        fontSize="7.5"
        fill={visited ? colors.text : colors.textDisabled}
        fontFamily="'Crimson Text', Georgia, serif"
        textAnchor={offset.anchor}
        opacity={labelOpacity}
        className="map-label-transition"
      >
        {wp.name}
      </text>
    </g>
  );
});
