import { useState } from 'react';
import { useStore } from '@/store';
import { selectDailyCyclePhase } from '@/store/selectors';
import { Pace, DiscretionaryAction } from '@/types/game-state';
import { colors } from '@/ui/theme';

const PACE_OPTIONS = [
  { value: Pace.Conservative, label: 'Conservative', title: 'Slower travel, less fatigue, safer' },
  { value: Pace.Normal, label: 'Normal', title: 'Standard pace, balanced risk' },
  { value: Pace.HardPush, label: 'Hard Push', title: 'Faster travel, high fatigue, risky' },
] as const;

const ACTION_OPTIONS = [
  { value: DiscretionaryAction.None, label: 'None', title: 'No special activity' },
  { value: DiscretionaryAction.Hunt, label: 'Hunt', title: 'Spend time hunting for food' },
  { value: DiscretionaryAction.Scout, label: 'Scout', title: 'Look ahead for hazards and opportunities' },
  { value: DiscretionaryAction.Repair, label: 'Repair Gear', title: 'Fix worn equipment' },
  { value: DiscretionaryAction.Forage, label: 'Forage', title: 'Gather edible plants and water' },
  { value: DiscretionaryAction.Rest, label: 'Rest', title: 'Full day of rest, camp healing' },
] as const;

export default function DayControls() {
  const phase = useStore(selectDailyCyclePhase);
  const [pace, setPace] = useState<Pace>(Pace.Normal);
  const [action, setAction] = useState<DiscretionaryAction>(DiscretionaryAction.None);
  const [nightTravel, setNightTravel] = useState(false);

  if (phase !== 'idle') return null;

  const handleConfirm = async () => {
    const store = useStore.getState();
    store.setDailyDecisions(pace, action, nightTravel);
    await store.startDailyCycle();
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <span style={styles.sectionLabel}>Pace</span>
        <div style={styles.radioGroup}>
          {PACE_OPTIONS.map((opt) => (
            <label key={opt.value} style={styles.radioLabel} title={opt.title}>
              <input
                type="radio"
                name="pace"
                checked={pace === opt.value}
                onChange={() => setPace(opt.value)}
                style={styles.radio}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <span style={styles.sectionLabel}>Action</span>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as DiscretionaryAction)}
          style={styles.select}
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.title}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={styles.section}>
        <label style={styles.checkLabel}>
          <input
            type="checkbox"
            checked={nightTravel}
            onChange={(e) => setNightTravel(e.target.checked)}
            style={styles.checkbox}
          />
          Night Travel
        </label>
        {nightTravel && (
          <span style={styles.hint}>
            +50% miles, +20 fatigue, riskier encounters
          </span>
        )}
      </div>

      <button onClick={handleConfirm} style={styles.confirmBtn}>
        Confirm &amp; Ride
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderTop: `1px solid ${colors.secondary}`,
    paddingTop: '8px',
    marginTop: '8px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionLabel: {
    fontSize: '11px',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  radioGroup: {
    display: 'flex',
    gap: '12px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    color: colors.text,
  },
  radio: {
    cursor: 'pointer',
    accentColor: colors.primary,
  },
  select: {
    fontSize: '13px',
    padding: '6px 8px',
    minHeight: '36px',
    fontFamily: "'Crimson Text', Georgia, serif",
    background: colors.input,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '3px',
    color: colors.text,
    cursor: 'pointer',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    color: colors.text,
  },
  checkbox: {
    cursor: 'pointer',
    accentColor: colors.primary,
  },
  hint: {
    fontSize: '11px',
    color: colors.secondaryDark,
    fontStyle: 'italic',
  },
  confirmBtn: {
    marginTop: '4px',
    padding: '10px 12px',
    minHeight: '44px',
    fontSize: '14px',
    fontFamily: "'Crimson Text', Georgia, serif",
    fontWeight: 600,
    background: colors.primary,
    color: colors.input,
    border: `1px solid ${colors.primaryDark}`,
    borderRadius: '4px',
    cursor: 'pointer',
    letterSpacing: '0.5px',
  },
};
