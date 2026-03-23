import { useCallback } from 'react';
import { useEscapeClose } from '@/ui/hooks/useEscapeClose';
import DayControls from '@/ui/components/DayControls';
import { colors } from '@/ui/theme';

interface Props {
  onClose: () => void;
}

export default function MobileDaySheet({ onClose }: Props) {
  const handleClose = useCallback(() => onClose(), [onClose]);
  useEscapeClose(true, handleClose);

  return (
    <>
      <div style={styles.backdrop} onClick={handleClose} />
      <div style={styles.sheet} className="mobile-day-sheet">
        <div style={styles.handle}>
          <div style={styles.pill} />
        </div>
        <DayControls />
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(26, 26, 26, 0.4)',
    zIndex: 50,
  },
  sheet: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: colors.card,
    borderRadius: '16px 16px 0 0',
    padding: '8px 20px 24px',
    paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
    zIndex: 51,
    maxHeight: '60vh',
    overflowY: 'auto',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
  },
  handle: {
    display: 'flex',
    justifyContent: 'center',
    padding: '4px 0 12px',
  },
  pill: {
    width: '40px',
    height: '4px',
    borderRadius: '2px',
    background: colors.secondary,
  },
};
