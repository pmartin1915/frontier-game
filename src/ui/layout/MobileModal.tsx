import { useCallback } from 'react';
import { useEscapeClose } from '@/ui/hooks/useEscapeClose';
import TravelLog from '@/ui/panels/TravelLog';
import MapPanel from '@/ui/panels/MapPanel';
import MobileStatsPanel from '@/ui/layout/MobileStatsPanel';
import { colors, typography } from '@/ui/theme';

export type MobilePanel = 'log' | 'map' | 'stats';

interface Props {
  activePanel: MobilePanel;
  onClose: () => void;
}

const TITLES: Record<MobilePanel, string> = {
  log: 'Travel Log',
  map: 'Trail Map',
  stats: 'Stats',
};

export default function MobileModal({ activePanel, onClose }: Props) {
  const handleClose = useCallback(() => onClose(), [onClose]);
  useEscapeClose(true, handleClose);

  return (
    <div style={styles.overlay} className="mobile-modal-enter">
      <div style={styles.header}>
        <button type="button" onClick={handleClose} style={styles.backBtn}>
          Back
        </button>
        <span style={styles.title}>{TITLES[activePanel]}</span>
        <div style={styles.spacer} />
      </div>
      <div style={styles.content}>
        {activePanel === 'log' && <TravelLog />}
        {activePanel === 'map' && (
          <div style={{ padding: '12px', height: '100%' }}>
            <MapPanel />
          </div>
        )}
        {activePanel === 'stats' && <MobileStatsPanel />}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: colors.base,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    borderBottom: `1px solid ${colors.borderLight}`,
    flexShrink: 0,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: '15px',
    color: colors.primary,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: typography.fontFamily,
    padding: '8px 4px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: colors.primaryDark,
    fontFamily: typography.fontFamily,
  },
  spacer: {
    width: '48px', // balance the Back button width
  },
  content: {
    flex: 1,
    overflowY: 'auto',
  },
};
