import { useStore } from '@/store';
import {
  selectPlayerHealth,
  selectWater,
  selectFood,
  selectWaterCapacity,
  selectFoodCapacity,
  selectDaysElapsed,
  selectDailyCyclePhase,
} from '@/store/selectors';
import { colors, resourceColor } from '@/ui/theme';

interface Props {
  onOpenLog: () => void;
  onOpenMap: () => void;
  onOpenStats: () => void;
  onOpenDayControls: () => void;
}

export default function MobileHudBar({ onOpenLog, onOpenMap, onOpenStats, onOpenDayControls }: Props) {
  const health = useStore(selectPlayerHealth);
  const water = useStore(selectWater);
  const waterCap = useStore(selectWaterCapacity);
  const food = useStore(selectFood);
  const foodCap = useStore(selectFoodCapacity);
  const days = useStore(selectDaysElapsed);
  const phase = useStore(selectDailyCyclePhase);

  return (
    <div style={styles.bar} className="mobile-hud-bar">
      {/* Stats strip */}
      <div style={styles.stats}>
        <span style={{ ...styles.statItem, color: resourceColor(health) }}>
          HP {health}
        </span>
        <span style={styles.divider}>/</span>
        <span style={{ ...styles.statItem, color: resourceColor((water / Math.max(waterCap, 1)) * 100) }}>
          W {water}
        </span>
        <span style={styles.divider}>/</span>
        <span style={{ ...styles.statItem, color: resourceColor((food / Math.max(foodCap, 1)) * 100) }}>
          F {food}
        </span>
        <span style={styles.divider}>/</span>
        <span style={styles.statItem}>D{days}</span>
      </div>

      {/* Action tabs */}
      <div style={styles.tabs}>
        <TabButton label="Log" onClick={onOpenLog} />
        <TabButton label="Map" onClick={onOpenMap} />
        <TabButton label="Stats" onClick={onOpenStats} />
        {phase === 'idle' && (
          <TabButton label="Go" onClick={onOpenDayControls} primary />
        )}
      </div>
    </div>
  );
}

function TabButton({ label, onClick, primary = false }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={primary ? styles.tabPrimary : styles.tab}
    >
      {label}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '56px',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    background: 'rgba(245, 240, 232, 0.92)',
    borderTop: `1px solid ${colors.borderLight}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    zIndex: 10,
    fontFamily: "'Crimson Text', Georgia, serif",
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  statItem: {
    fontSize: '13px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  divider: {
    fontSize: '11px',
    color: colors.textMuted,
    margin: '0 2px',
  },
  tabs: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  tab: {
    padding: '8px 14px',
    minHeight: '40px',
    background: colors.button,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'Crimson Text', Georgia, serif",
    color: colors.primaryDark,
  },
  tabPrimary: {
    padding: '8px 14px',
    minHeight: '40px',
    background: colors.primary,
    border: `1px solid ${colors.primaryDark}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: "'Crimson Text', Georgia, serif",
    color: colors.base,
  },
};
