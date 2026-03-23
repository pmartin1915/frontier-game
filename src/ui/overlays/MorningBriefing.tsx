/**
 * Frontier — Morning Briefing Overlay
 *
 * Renders when dailyCyclePhase === 'briefing'.
 * Shows previous day narrative excerpt, supply warnings, companion status.
 * "Begin Day" dismisses → phase to 'idle'.
 */

import { useCallback } from 'react';
import { useStore } from '@/store';
import {
  selectDailyCyclePhase,
  selectPreviousEntry,
  selectDaysElapsed,
  selectWater,
  selectFood,
  selectPlayerHealth,
  selectPlayerMorale,
  selectHorseHealth,
  selectCompanions,
} from '@/store/selectors';
import { CHARACTER_BIBLES } from '@/types/companions';
import MiniBar from '@/ui/components/MiniBar';
import { colors } from '@/ui/theme';
import { useEscapeClose } from '@/ui/hooks/useEscapeClose';

export default function MorningBriefing() {
  const phase = useStore(selectDailyCyclePhase);
  const narrative = useStore(selectPreviousEntry);
  const days = useStore(selectDaysElapsed);
  const water = useStore(selectWater);
  const food = useStore(selectFood);
  const health = useStore(selectPlayerHealth);
  const morale = useStore(selectPlayerMorale);
  const horseHealth = useStore(selectHorseHealth);
  const companions = useStore(selectCompanions);

  const isOpen = phase === 'briefing';

  const handleDismiss = useCallback(() => {
    useStore.getState().dismissOverlay();
  }, []);

  useEscapeClose(isOpen, handleDismiss);

  if (!isOpen) return null;

  const warnings: string[] = [];
  if (water <= 5) warnings.push('Water critically low');
  if (food <= 5) warnings.push('Food critically low');
  if (health < 30) warnings.push('You are badly injured');
  if (horseHealth < 30) warnings.push('Horse is in poor condition');

  const activeCompanions = companions.filter((c) => c.status === 'active');

  return (
    <div style={styles.overlay} className="frontier-overlay">
      <div style={styles.card} className="frontier-overlay-card">
        <h2 style={styles.title}>Day {days}</h2>

        {narrative && (
          <p style={styles.narrative}>{narrative}</p>
        )}

        {warnings.length > 0 && (
          <div style={styles.warningBox}>
            {warnings.map((w, i) => (
              <div key={i} style={styles.warningItem}>{w}</div>
            ))}
          </div>
        )}

        <div style={styles.statusSection}>
          <span style={styles.statusLabel}>Your Status</span>
          <div style={styles.statusRow}>
            <span style={styles.statusName}>Health</span>
            <MiniBar label="" value={health} width="80px" />
          </div>
          <div style={styles.statusRow}>
            <span style={styles.statusName}>Morale</span>
            <MiniBar label="" value={morale} width="80px" />
          </div>
        </div>

        {activeCompanions.length > 0 && (
          <div style={styles.companionSection}>
            <span style={styles.companionLabel}>Party</span>
            {activeCompanions.map((c) => {
              const bible = CHARACTER_BIBLES[c.id];
              return (
                <div key={c.id} style={styles.companionRow}>
                  <span style={styles.companionName}>{bible.name}</span>
                  <MiniBar label="H" value={c.health} />
                  <MiniBar label="M" value={c.morale} />
                  <MiniBar label="L" value={c.loyalty} />
                </div>
              );
            })}
          </div>
        )}

        <button type="button" style={styles.beginBtn} onClick={handleDismiss}>
          Begin Day
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
    background: 'rgba(26, 26, 26, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  card: {
    background: colors.card,
    border: `2px solid ${colors.primary}`,
    borderRadius: '8px',
    padding: '24px 32px',
    maxWidth: '480px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    fontFamily: "'Crimson Text', Georgia, serif",
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: colors.primaryDark,
    margin: '0 0 16px 0',
    textAlign: 'center' as const,
    borderBottom: `1px solid ${colors.secondary}`,
    paddingBottom: '8px',
  },
  narrative: {
    fontSize: '14px',
    lineHeight: '1.7',
    color: colors.textBody,
    margin: '0 0 16px 0',
    fontStyle: 'italic',
    borderLeft: `3px solid ${colors.secondary}`,
    paddingLeft: '12px',
  },
  warningBox: {
    background: '#f5e6e0',
    border: '1px solid #c4766b',
    borderRadius: '4px',
    padding: '8px 12px',
    margin: '0 0 16px 0',
  },
  warningItem: {
    fontSize: '13px',
    color: colors.warning,
    lineHeight: '1.5',
  },
  statusSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    margin: '0 0 16px 0',
  },
  statusLabel: {
    fontSize: '11px',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusName: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.primaryDark,
    minWidth: '50px',
  },
  companionSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    margin: '0 0 16px 0',
  },
  companionLabel: {
    fontSize: '11px',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  companionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  companionName: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.primaryDark,
  },
  beginBtn: {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    background: colors.primary,
    border: 'none',
    borderRadius: '4px',
    color: colors.card,
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Crimson Text', Georgia, serif",
    transition: 'background 0.15s',
  },
};
