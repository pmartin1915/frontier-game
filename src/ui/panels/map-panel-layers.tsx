/**
 * Frontier — Map Panel Layers
 *
 * Static SVG sub-components for the living map:
 *  - BiomeFillZones   — soft colored biome regions
 *  - TerrainIllustration — rivers, mountains, desert hatching, forest glyphs
 *  - CompassRose       — decorative 8-point compass in lower-left
 *  - DecorativeBorder  — double-line border + corner diamond ornaments
 *
 * All coordinates assume viewBox "0 0 420 270" with toSvg()+10 offset.
 * No store imports. No props except where biome context is needed.
 */

import { memo } from 'react';
import { Biome } from '@/types/game-state';

// ============================================================
// BIOME FILL ZONES
// ============================================================

const BIOME_FILL: Record<Biome, string> = {
  [Biome.CrossTimbers]:   '#4a6b3a',
  [Biome.StakedPlains]:   '#c4a868',
  [Biome.DesertApproach]: '#b8956a',
  [Biome.PecosValley]:    '#8b7355',
  [Biome.HighDesert]:     '#a0845c',
  [Biome.MountainPass]:   '#6b7b8b',
  [Biome.ColoradoPlains]: '#7a9b5a',
};

interface BiomeFillZonesProps { currentBiome: Biome }

export const BiomeFillZones = memo(function BiomeFillZones({ currentBiome }: BiomeFillZonesProps) {
  const zones: { biome: Biome; points: string }[] = [
    {
      biome: Biome.CrossTimbers,
      points: '280,188 385,188 385,262 280,262',
    },
    {
      biome: Biome.StakedPlains,
      points: '192,156 242,156 242,192 192,192',
    },
    {
      biome: Biome.DesertApproach,
      points: '144,128 205,128 205,168 144,168',
    },
    {
      biome: Biome.PecosValley,
      points: '118,112 156,112 156,146 118,146',
    },
    {
      biome: Biome.HighDesert,
      points: '96,88 132,88 132,118 96,118',
    },
    {
      biome: Biome.MountainPass,
      points: '74,54 108,54 108,84 74,84',
    },
    {
      biome: Biome.ColoradoPlains,
      points: '44,16 88,16 88,64 44,64',
    },
  ];

  return (
    <g id="biome-fill-zones">
      {zones.map(({ biome, points }) => (
        <polygon
          key={biome}
          points={points}
          fill={BIOME_FILL[biome]}
          opacity={biome === currentBiome ? 0.22 : 0.10}
          className="map-biome-zone"
        />
      ))}
    </g>
  );
});

// ============================================================
// TERRAIN ILLUSTRATION
// ============================================================

/** Small tree glyph centered at (cx, cy) */
function TreeGlyph({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const tw = 2 * scale;
  const th = 4 * scale;
  const cw = 8 * scale;
  const ch = 8 * scale;
  return (
    <g>
      {/* Trunk */}
      <rect
        x={cx - tw / 2}
        y={cy - th}
        width={tw}
        height={th}
        fill="#6b4a2a"
        opacity={0.6}
      />
      {/* Canopy triangle */}
      <polygon
        points={`${cx - cw / 2},${cy - th} ${cx},${cy - th - ch} ${cx + cw / 2},${cy - th}`}
        fill="#3a5a28"
        opacity={0.55}
      />
    </g>
  );
}

export const TerrainIllustration = memo(function TerrainIllustration() {
  return (
    <g id="terrain-illustration">

      {/* ── Rivers ─────────────────────────────────────────── */}
      <g id="rivers" fill="none" strokeLinecap="round">
        {/* Brazos River — Fort Belknap area, flows SE */}
        <path
          d="M 345,232 C 358,238 372,246 395,258"
          stroke="#4a7a9b"
          strokeWidth="1.5"
          opacity="0.65"
          strokeDasharray="5 3"
        />
        {/* Middle Concho — short wave near waypoint */}
        <path
          d="M 288,207 C 298,201 310,212 326,206"
          stroke="#4a7a9b"
          strokeWidth="1.5"
          opacity="0.65"
          strokeDasharray="5 3"
        />
        {/* Pecos River — runs alongside trail, Horsehead → Fort Sumner */}
        <path
          d="M 226,176 C 208,169 188,160 168,150 C 162,146 155,140 148,137"
          stroke="#4a7a9b"
          strokeWidth="1.5"
          opacity="0.55"
          strokeDasharray="5 3"
        />
        {/* Rio Grande stub — near Santa Fe */}
        <path
          d="M 112,100 C 116,104 118,111 115,117"
          stroke="#4a7a9b"
          strokeWidth="1.2"
          opacity="0.50"
          strokeDasharray="4 3"
        />
      </g>

      {/* ── Mountain Glyphs ─────────────────────────────────── */}
      <g id="mountains" strokeLinejoin="round">
        {/* Guadalupe Mountains — between Castle Gap and Fort Sumner */}
        <g fill="#7a6a5a" stroke="#5a4a3a" strokeWidth="0.6" opacity="0.55">
          <polygon points="174,154 180,142 186,154" />
          <polygon points="181,154 188,139 195,154" />
          <polygon points="190,154 195,145 200,154" />
        </g>

        {/* Sangre de Cristo Range — east of Santa Fe–Raton corridor */}
        <g fill="#6b7b8b" stroke="#4a5a6a" strokeWidth="0.6" opacity="0.62">
          <polygon points="130,106 136,84 142,106" />
          <polygon points="138,106 145,80 152,106" />
          <polygon points="146,106 153,86 160,106" />
          <polygon points="154,106 160,92 166,106" />
        </g>

        {/* Colorado Foothills — above Trinidad toward Denver */}
        <polygon
          points="55,52 62,38 69,44 76,32 83,43 90,37 98,52"
          fill="#5a6870"
          stroke="none"
          opacity="0.42"
        />
      </g>

      {/* ── Desert Hatching (Staked Plains) ─────────────────── */}
      <g
        id="staked-plains-hatching"
        stroke="#c4a868"
        strokeWidth="0.5"
        opacity="0.28"
        strokeLinecap="round"
      >
        <line x1="196" y1="166" x2="208" y2="180" />
        <line x1="203" y1="163" x2="215" y2="177" />
        <line x1="210" y1="161" x2="222" y2="175" />
        <line x1="217" y1="160" x2="229" y2="174" />
        <line x1="193" y1="172" x2="204" y2="183" />
        <line x1="185" y1="168" x2="197" y2="180" />
      </g>

      {/* ── Chihuahuan Desert stipple (Castle Gap → Fort Sumner) ── */}
      <g id="chihuahuan-stipple" fill="#b8956a" opacity="0.32">
        {[
          [155,148],[162,140],[170,143],[158,134],[148,132],
          [165,128],[175,138],[180,132],[152,128],[168,145],
          [142,136],[173,126],[185,143],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="1" />
        ))}
      </g>

      {/* ── Trail Ruts (parallel dashed lines alongside trail) ── */}
      <g
        id="trail-ruts"
        fill="none"
        stroke="#8b7355"
        strokeWidth="0.5"
        strokeDasharray="6 4"
        opacity="0.20"
      >
        {/* These roughly parallel the trail at ±3px offset — approximated as polyline */}
        <polyline points="353,233 313,204 233,178 205,164 153,132 125,103 101,71 84,54 60,29" />
        <polyline points="347,237 307,206 227,182 199,166 147,138 119,107 95,75 80,57 56,31" />
      </g>

      {/* ── Forest Glyphs (Cross Timbers) ───────────────────── */}
      <g id="cross-timbers-forest" opacity="0.90">
        <TreeGlyph cx={320} cy={232} />
        <TreeGlyph cx={330} cy={227} />
        <TreeGlyph cx={342} cy={234} />
        <TreeGlyph cx={353} cy={228} />
        <TreeGlyph cx={326} cy={240} />
        <TreeGlyph cx={337} cy={238} />
        <TreeGlyph cx={348} cy={241} />
        <TreeGlyph cx={360} cy={225} />
      </g>

      {/* ── Canyon Symbol (Castle Gap) ──────────────────────── */}
      <g id="castle-gap-canyon" fill="none" stroke="#5B3A29" strokeWidth="1" opacity="0.55">
        <line x1="196" y1="160" x2="202" y2="170" />
        <line x1="208" y1="160" x2="202" y2="170" />
      </g>

      {/* ── Region Labels ──────────────────────────────────── */}
      <g
        id="region-labels"
        fontFamily="'Crimson Text', Georgia, serif"
        fontSize="7"
        fontStyle="italic"
        fill="#3a2810"
        opacity="0.38"
        textAnchor="middle"
        letterSpacing="0.5"
      >
        <text x="215" y="174" transform="rotate(-8, 215, 174)">LLANO ESTACADO</text>
        <text x="162" y="150" transform="rotate(-12, 162, 150)">PECOS VALLEY</text>
        <text x="152" y="92" transform="rotate(-22, 152, 92)">SANGRE DE CRISTO</text>
        <text x="68" y="42" transform="rotate(-20, 68, 42)">COLORADO TERRITORY</text>
      </g>

    </g>
  );
});

// ============================================================
// COMPASS ROSE
// ============================================================

export const CompassRose = memo(function CompassRose() {
  // Centered at (22, 250). Outer radius 9, inner radius 4.5.
  const cx = 22;
  const cy = 250;
  const ro = 9;   // outer
  const ri = 4.5; // inner

  // 8-point star: N/E/S/W (cardinal) + NE/SE/SW/NW (intercardinal)
  const angles = [270, 315, 0, 45, 90, 135, 180, 225]; // degrees, 0=E in math
  const starPoints = angles
    .flatMap((deg, i) => {
      const r = i % 2 === 0 ? ro : ri; // even = cardinal (outer), odd = intercardinal (inner)
      const rad = (deg * Math.PI) / 180;
      return [`${(cx + r * Math.cos(rad)).toFixed(1)},${(cy + r * Math.sin(rad)).toFixed(1)}`];
    })
    .join(' ');

  return (
    <g id="compass-rose" opacity="0.70">
      {/* Star body */}
      <polygon
        points={starPoints}
        fill="#c4b08b"
        stroke="#5B3A29"
        strokeWidth="0.6"
      />
      {/* Hub dot */}
      <circle cx={cx} cy={cy} r="1.5" fill="#5B3A29" />
      {/* Cardinal labels */}
      <text x={cx} y={cy - ro - 3} textAnchor="middle" fontSize="5.5"
        fontFamily="'Crimson Text', Georgia, serif" fill="#5B3A29" fontWeight="bold">N</text>
      <text x={cx} y={cy + ro + 8} textAnchor="middle" fontSize="5.5"
        fontFamily="'Crimson Text', Georgia, serif" fill="#5B3A29">S</text>
      <text x={cx + ro + 4} y={cy + 2} textAnchor="start" fontSize="5.5"
        fontFamily="'Crimson Text', Georgia, serif" fill="#5B3A29">E</text>
      <text x={cx - ro - 4} y={cy + 2} textAnchor="end" fontSize="5.5"
        fontFamily="'Crimson Text', Georgia, serif" fill="#5B3A29">W</text>
    </g>
  );
});

// ============================================================
// DECORATIVE BORDER
// ============================================================

export const DecorativeBorder = memo(function DecorativeBorder() {
  // Diamond ornament at each corner
  const dSize = 4; // half-width of diamond
  const corners = [
    { cx: 6, cy: 6 },
    { cx: 414, cy: 6 },
    { cx: 414, cy: 264 },
    { cx: 6, cy: 264 },
  ];

  return (
    <g id="decorative-border">
      {/* Outer border */}
      <rect x="2" y="2" width="416" height="266" fill="none"
        stroke="#8b7355" strokeWidth="1.2" opacity="0.65" />
      {/* Inner border */}
      <rect x="5" y="5" width="410" height="260" fill="none"
        stroke="#c4b08b" strokeWidth="0.6" opacity="0.50" />

      {/* Corner diamond ornaments */}
      {corners.map(({ cx, cy }, i) => (
        <polygon
          key={i}
          points={`${cx},${cy - dSize} ${cx + dSize},${cy} ${cx},${cy + dSize} ${cx - dSize},${cy}`}
          fill="#c4b08b"
          stroke="#8b7355"
          strokeWidth="0.6"
          opacity="0.75"
        />
      ))}
    </g>
  );
});
