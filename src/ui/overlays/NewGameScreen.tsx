/**
 * Frontier — New Game Screen
 *
 * Shows on first load (daysElapsed===0, phase==='idle', no gameEndState).
 * Player enters name and horse name, then begins the journey.
 */

import { useState } from 'react';
import { useStore } from '@/store';
import {
  selectGameInitialized,
  selectGameEndState,
} from '@/store/selectors';
import { colors } from '@/ui/theme';

export default function NewGameScreen() {
  const gameInitialized = useStore(selectGameInitialized);
  const gameEndState = useStore(selectGameEndState);

  const [playerName, setPlayerName] = useState('Martin');
  const [horseName, setHorseName] = useState('Horse');

  if (gameInitialized || gameEndState !== null) return null;

  const handleBegin = () => {
    const name = playerName.trim() || 'Martin';
    const horse = horseName.trim() || 'Horse';
    useStore.getState().initializeGame(name, horse);
  };

  return (
    <div style={styles.overlay} className="frontier-overlay">
      <div style={styles.card} className="frontier-overlay-card">
        <h1 style={styles.title}>Frontier</h1>
        <div style={styles.ornament}>{'\u2014 \u2726 \u2014'}</div>
        <p style={styles.subtitle}>
          Fort Belknap, Texas {'\u2014'} June 1866. The trail to Denver lies open before you.
        </p>
        <p style={styles.flavor}>
          You have a horse, a rifle, and what provisions you could gather.
        </p>

        <div style={styles.fields}>
          <label style={styles.label}>
            Your name
            <input
              type="text"
              style={styles.input}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={24}
            />
          </label>
          <label style={styles.label}>
            Horse name
            <input
              type="text"
              style={styles.input}
              value={horseName}
              onChange={(e) => setHorseName(e.target.value)}
              maxLength={24}
            />
          </label>
        </div>

        <button type="button" style={styles.beginBtn} onClick={handleBegin}>
          Begin Journey
        </button>
      </div>
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
    background: 'radial-gradient(ellipse at center, rgba(26,26,26,0.6) 0%, rgba(26,26,26,0.85) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1300,
  },
  card: {
    background: colors.card,
    border: `2px solid ${colors.primary}`,
    borderTop: `4px solid ${colors.secondary}`,
    borderRadius: '8px',
    padding: '32px 40px',
    maxWidth: '420px',
    width: '90%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontFamily: "'Crimson Text', Georgia, serif",
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '36px',
    fontWeight: 700,
    color: colors.primaryDark,
    margin: '0 0 4px 0',
    letterSpacing: '5px',
    textTransform: 'uppercase' as const,
  },
  ornament: {
    fontSize: '16px',
    color: colors.secondary,
    margin: '0 0 12px 0',
    letterSpacing: '4px',
  },
  subtitle: {
    fontSize: '16px',
    color: colors.textSecondary,
    lineHeight: '1.5',
    margin: '0 0 8px 0',
    fontStyle: 'italic',
  },
  fields: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    marginBottom: '24px',
    textAlign: 'left' as const,
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    fontSize: '13px',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  input: {
    padding: '8px 12px',
    background: colors.input,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '4px',
    fontSize: '16px',
    fontFamily: "'Crimson Text', Georgia, serif",
    color: colors.text,
  },
  flavor: {
    fontSize: '14px',
    color: colors.textMuted,
    lineHeight: '1.5',
    margin: '0 0 24px 0',
  },
  beginBtn: {
    padding: '10px 32px',
    background: colors.primary,
    border: `1px solid ${colors.primaryDark}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontFamily: "'Crimson Text', Georgia, serif",
    fontWeight: 600,
    color: colors.card,
    letterSpacing: '0.5px',
    transition: 'transform 0.15s',
  },
};
