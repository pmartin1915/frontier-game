import { useState } from 'react';
import { colors, typography } from '@/ui/theme';

const STORAGE_KEY = 'frontier_help_dismissed';

export default function HelpCard() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1',
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>How to Play</span>
        <button type="button" style={styles.closeBtn} onClick={handleDismiss} aria-label="Dismiss help">
          X
        </button>
      </div>
      <ul style={styles.list}>
        <li>Each day, choose your <strong>pace</strong> and an optional <strong>action</strong>.</li>
        <li>Watch your <strong>water and food</strong> — running out is deadly.</li>
        <li>Encounters appear on the trail. Choose wisely.</li>
        <li>Camp at night to heal, repair gear, and bond with companions.</li>
        <li>Reach <strong>Denver</strong> alive to win.</li>
      </ul>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: colors.button,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '6px',
    padding: '10px 14px',
    marginBottom: '8px',
    fontFamily: typography.fontFamily,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  title: {
    fontSize: '13px',
    fontWeight: 700,
    color: colors.primaryDark,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '12px',
    fontWeight: 700,
    color: colors.textMuted,
    cursor: 'pointer',
    padding: '2px 6px',
    fontFamily: typography.fontFamily,
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
    fontSize: '13px',
    color: colors.textBody,
    lineHeight: '1.6',
  },
};
