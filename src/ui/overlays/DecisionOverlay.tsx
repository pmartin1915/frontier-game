/**
 * Frontier — Decision Overlay
 *
 * Renders when an encounter triggers during the daily cycle.
 * Shows encounter name, description, and player choices.
 * Grayed choices indicate unmet requirements.
 * Selecting a choice resolves the encounter via store action.
 */

import { useStore } from '@/store';
import {
  selectPendingEncounter,
  selectDailyCyclePhase,
  selectIsBargainActive,
} from '@/store/selectors';
import { colors } from '@/ui/theme';

export default function DecisionOverlay() {
  const encounter = useStore(selectPendingEncounter);
  const phase = useStore(selectDailyCyclePhase);
  const bargainActive = useStore(selectIsBargainActive);

  // Only show when in event phase with a pending encounter (and no bargain showing)
  if (phase !== 'event' || !encounter || bargainActive) return null;

  const handleChoice = (choiceId: string) => {
    useStore.getState().resolveEncounterChoice(choiceId);
  };

  return (
    <div style={styles.overlay} className="frontier-overlay">
      <div style={styles.card} className="frontier-overlay-card">
        <h2 style={styles.title}>{encounter.name}</h2>
        <p style={styles.description}>{encounter.description}</p>

        <div style={styles.choices}>
          {encounter.choices.map((choice) => (
            <button
              key={choice.id}
              style={{
                ...styles.choiceBtn,
                ...(choice.available ? {} : styles.choiceBtnDisabled),
              }}
              disabled={!choice.available}
              onClick={() => handleChoice(choice.id)}
            >
              <span style={styles.choiceLabel}>{choice.label}</span>
              <span style={styles.choiceDesc}>{choice.description}</span>
              {!choice.available && (
                <span style={styles.locked}>
                  {choice.requirements && choice.requirements.length > 0
                    ? choice.requirements.map((r) => {
                        if (r.type === 'skill') return `Requires ${r.key} ${r.minValue ?? 0}+`;
                        if (r.type === 'supply') return `Requires ${r.key} ${r.minValue ?? 0}+`;
                        if (r.type === 'equipment') return `Requires ${r.key}`;
                        if (r.type === 'companion') return r.key === 'any' ? 'Requires a companion' : `Requires ${r.key}`;
                        if (r.type === 'morale') return `Requires morale ${r.minValue ?? 0}+`;
                        return 'Requirements not met';
                      }).join(' \u00b7 ')
                    : 'Requirements not met'}
                </span>
              )}
            </button>
          ))}
        </div>
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
    background: 'rgba(26, 26, 26, 0.6)',
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
    maxWidth: '520px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    fontFamily: "'Crimson Text', Georgia, serif",
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: colors.primaryDark,
    margin: '0 0 12px 0',
    borderBottom: `1px solid ${colors.secondary}`,
    paddingBottom: '8px',
  },
  description: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: colors.textBody,
    margin: '0 0 20px 0',
  },
  choices: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  choiceBtn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    padding: '12px 16px',
    background: colors.button,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: "'Crimson Text', Georgia, serif",
    transition: 'background 0.15s',
  },
  choiceBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    background: colors.disabled,
  },
  choiceLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.primaryDark,
  },
  choiceDesc: {
    fontSize: '13px',
    color: colors.textSecondary,
    lineHeight: '1.4',
  },
  locked: {
    fontSize: '11px',
    color: colors.warning,
    fontStyle: 'italic',
    marginTop: '2px',
  },
};
