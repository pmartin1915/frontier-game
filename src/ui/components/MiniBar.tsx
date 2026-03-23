/**
 * Frontier — MiniBar
 *
 * Shared mini progress bar used in HUD, MorningBriefing, GameEndScreen.
 * Renders a short label + colored fill bar track.
 * Supports configurable width/height for different contexts.
 */

import { colors } from '@/ui/theme';
import { resourceColor } from '@/ui/theme';

interface MiniBarProps {
  label: string;
  value: number;
  /** Bar track width — default '40px'. Use '100%' for HUD stat bars. */
  width?: string;
  /** Bar track height in px — default 6. */
  height?: number;
}

export default function MiniBar({ label, value, width = '40px', height = 6 }: MiniBarProps) {
  return (
    <div style={styles.miniBar}>
      {label && <span style={styles.miniLabel}>{label}</span>}
      <div style={{ ...styles.barTrack, width, height: `${height}px`, borderRadius: `${height / 2}px` }}>
        <div
          style={{
            height: '100%',
            borderRadius: `${height / 2}px`,
            transition: 'width 0.3s',
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: resourceColor(value),
          }}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  miniBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  miniLabel: {
    fontSize: '10px',
    color: colors.textMuted,
    width: '10px',
    flexShrink: 0,
  },
  barTrack: {
    background: colors.disabled,
    overflow: 'hidden',
  },
};
