/**
 * Frontier — Game End Screen
 *
 * Shows when gameEndState is set (victory or death).
 * Displays summary stats and offers Load Game / New Journey options.
 * Victory: warm gold accent. Death: muted red accent.
 */

import { useStore } from '@/store';
import { selectGameEndState } from '@/store/selectors';
import MiniBar from '@/ui/components/MiniBar';
import { colors } from '@/ui/theme';

export default function GameEndScreen() {
  const endState = useStore(selectGameEndState);

  if (!endState) return null;

  const isVictory = endState.reason === 'victory';

  const handleNewJourney = () => {
    useStore.getState().resetGame();
  };

  const handleLoadGame = () => {
    useStore.getState().toggleSaveLoadModal();
  };

  const accentColor = isVictory ? colors.mapPlayerDot : colors.warning;

  return (
    <div style={styles.overlay} className="frontier-overlay">
      <div
        style={{
          ...styles.card,
          borderTop: `4px solid ${accentColor}`,
        }}
        className="frontier-overlay-card"
      >
        <h1 style={styles.title}>
          {isVictory
            ? 'You Have Arrived in Denver'
            : 'The Trail Has Claimed You'}
        </h1>

        <div style={styles.ornament}>{'\u2014 \u2726 \u2014'}</div>

        <p style={{
          ...styles.subtitle,
          color: isVictory ? colors.success : colors.textSecondary,
        }}>
          {isVictory
            ? 'After weeks of hardship, the rooftops of Denver City rise from the plains. The journey is over.'
            : 'The land does not forgive. Your story ends here, beneath an indifferent sky.'}
        </p>

        <div style={styles.statsGrid}>
          <StatRow label="Days on the trail" value={endState.daysElapsed} />
          <StatRow label="Miles traveled" value={endState.totalMiles} />
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Final health</span>
            <div style={styles.statBarGroup}>
              <span style={styles.statValue}>{endState.finalHealth}</span>
              <MiniBar label="" value={endState.finalHealth} width="60px" />
            </div>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Final morale</span>
            <div style={styles.statBarGroup}>
              <span style={styles.statValue}>{endState.finalMorale}</span>
              <MiniBar label="" value={endState.finalMorale} width="60px" />
            </div>
          </div>
          <StatRow
            label="Companions"
            value={`${endState.companionsAlive} of ${endState.maxCompanions}`}
          />
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.primaryBtn} onClick={handleNewJourney}>
            New Journey
          </button>
          <button type="button" style={styles.secondaryBtn} onClick={handleLoadGame}>
            Load Game
          </button>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.statRow}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(26, 26, 26, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1300,
  },
  card: {
    background: colors.card,
    border: `2px solid ${colors.primary}`,
    borderRadius: '8px',
    padding: '32px 40px',
    maxWidth: '480px',
    width: '90%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontFamily: "'Crimson Text', Georgia, serif",
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.primaryDark,
    margin: '0 0 4px 0',
  },
  ornament: {
    fontSize: '14px',
    color: colors.secondary,
    margin: '0 0 12px 0',
    letterSpacing: '4px',
  },
  subtitle: {
    fontSize: '15px',
    lineHeight: '1.5',
    margin: '0 0 24px 0',
  },
  statsGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginBottom: '24px',
    padding: '16px',
    background: colors.button,
    borderRadius: '4px',
    border: `1px solid ${colors.secondary}`,
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '14px',
    color: colors.textMuted,
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.primaryDark,
  },
  statBarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  primaryBtn: {
    padding: '8px 24px',
    background: colors.primary,
    border: `1px solid ${colors.primaryDark}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '15px',
    fontFamily: "'Crimson Text', Georgia, serif",
    fontWeight: 600,
    color: colors.card,
  },
  secondaryBtn: {
    padding: '8px 24px',
    background: colors.button,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '15px',
    fontFamily: "'Crimson Text', Georgia, serif",
    fontWeight: 600,
    color: colors.primaryDark,
  },
};
