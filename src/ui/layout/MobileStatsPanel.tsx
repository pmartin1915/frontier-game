import { useStore } from '@/store';
import {
  selectPlayerHealth,
  selectPlayerMorale,
  selectPlayerFatigue,
  selectWater,
  selectFood,
  selectCoffee,
  selectAmmo,
  selectWaterCapacity,
  selectFoodCapacity,
  selectHorseHealth,
  selectHorseFatigue,
  selectCompanions,
  selectTransportMode,
  selectDaysElapsed,
  selectTotalMiles,
  selectAutoPlay,
  selectGameInitialized,
  selectAudioPrefs,
} from '@/store/selectors';
import { CHARACTER_BIBLES } from '@/types/companions';
import { SfxEvent } from '@/types/audio';
import MiniBar from '@/ui/components/MiniBar';
import { colors, resourceColor, typography } from '@/ui/theme';

export default function MobileStatsPanel() {
  const health = useStore(selectPlayerHealth);
  const morale = useStore(selectPlayerMorale);
  const fatigue = useStore(selectPlayerFatigue);
  const water = useStore(selectWater);
  const food = useStore(selectFood);
  const coffee = useStore(selectCoffee);
  const ammo = useStore(selectAmmo);
  const waterCap = useStore(selectWaterCapacity);
  const foodCap = useStore(selectFoodCapacity);
  const horseHealth = useStore(selectHorseHealth);
  const horseFatigue = useStore(selectHorseFatigue);
  const companions = useStore(selectCompanions);
  const transport = useStore(selectTransportMode);
  const days = useStore(selectDaysElapsed);
  const miles = useStore(selectTotalMiles);
  const autoPlay = useStore(selectAutoPlay);
  const gameInit = useStore(selectGameInitialized);
  const audioPrefs = useStore(selectAudioPrefs);

  const activeCompanions = companions.filter((c) => c.status === 'active');

  return (
    <div style={styles.container}>
      {/* Journey */}
      <Section title="Journey">
        <StatRow label="Day" value={days} />
        <StatRow label="Miles" value={miles} />
        <StatRow label="Transport" value={transport} capitalize />
      </Section>

      {/* Player */}
      <Section title="Player">
        <BarRow label="Health" value={health} />
        <BarRow label="Morale" value={morale} />
        <StatRow label="Fatigue" value={fatigue} />
      </Section>

      {/* Horse */}
      <Section title="Horse">
        <BarRow label="Health" value={horseHealth} />
        <StatRow label="Fatigue" value={horseFatigue} />
      </Section>

      {/* Supplies */}
      <Section title="Supplies">
        <StatRow label="Water" value={`${water} / ${waterCap}`} color={resourceColor((water / Math.max(waterCap, 1)) * 100)} />
        <StatRow label="Food" value={`${food} / ${foodCap}`} color={resourceColor((food / Math.max(foodCap, 1)) * 100)} />
        <StatRow label="Coffee" value={coffee} />
        <StatRow label="Ammo" value={ammo} />
      </Section>

      {/* Companions */}
      {activeCompanions.length > 0 && (
        <Section title="Companions">
          {activeCompanions.map((c) => {
            const bible = CHARACTER_BIBLES[c.id];
            return (
              <div key={c.id} style={styles.companionRow}>
                <span style={styles.companionName}>{bible.name}</span>
                <MiniBar label="L" value={c.loyalty} />
                <MiniBar label="H" value={c.health} />
              </div>
            );
          })}
        </Section>
      )}

      {/* Controls */}
      <Section title="Controls">
        {gameInit && (
          <button
            type="button"
            style={autoPlay ? styles.btnActive : styles.btn}
            onClick={() => useStore.getState().setAutoPlay(!autoPlay)}
          >
            {autoPlay ? 'Auto Play: ON' : 'Auto Play: OFF'}
          </button>
        )}
        <button
          type="button"
          style={styles.btn}
          onClick={() => {
            useStore.getState().triggerSfx(SfxEvent.Click);
            useStore.getState().toggleSaveLoadModal();
          }}
        >
          Journal
        </button>
      </Section>

      {/* Audio */}
      <Section title="Audio">
        <AudioSlider label="Master" value={audioPrefs.master} onChange={(v) => useStore.getState().setAudioPref('master', v)} />
        <AudioSlider label="Music" value={audioPrefs.music} onChange={(v) => useStore.getState().setAudioPref('music', v)} />
        <AudioSlider label="SFX" value={audioPrefs.sfx} onChange={(v) => useStore.getState().setAudioPref('sfx', v)} />
        <button
          type="button"
          style={audioPrefs.muted ? styles.btnMuted : styles.btn}
          onClick={() => {
            useStore.getState().triggerSfx(SfxEvent.Click);
            useStore.getState().setAudioPref('muted', !audioPrefs.muted);
          }}
        >
          {audioPrefs.muted ? 'Unmute' : 'Mute'}
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.section}>
      <span style={styles.sectionTitle}>{title}</span>
      {children}
    </div>
  );
}

function StatRow({ label, value, color, capitalize }: { label: string; value: string | number; color?: string; capitalize?: boolean }) {
  return (
    <div style={styles.statRow}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...styles.value, color: color ?? colors.text, textTransform: capitalize ? 'capitalize' : undefined }}>{value}</span>
    </div>
  );
}

function BarRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.statRow}>
      <span style={styles.label}>{label}</span>
      <div style={styles.barContainer}>
        <MiniBar label="" value={value} width="60px" height={8} />
        <span style={{ ...styles.value, color: resourceColor(value) }}>{value}</span>
      </div>
    </div>
  );
}

function AudioSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={styles.audioRow}>
      <span style={styles.label}>{label}</span>
      <input
        aria-label={`${label} volume`}
        type="range" min={0} max={1} step={0.05}
        value={value}
        style={styles.slider}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    fontFamily: typography.fontFamily,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: colors.secondaryDark,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: '2px',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2px 0',
  },
  label: {
    fontSize: '14px',
    color: colors.textSecondary,
  },
  value: {
    fontSize: '14px',
    fontWeight: 600,
  },
  barContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  companionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '2px 0',
  },
  companionName: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.primaryDark,
    minWidth: '70px',
  },
  btn: {
    width: '100%',
    padding: '10px',
    minHeight: '44px',
    background: colors.button,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: typography.fontFamily,
    fontWeight: 600,
    color: colors.primaryDark,
  },
  btnActive: {
    width: '100%',
    padding: '10px',
    minHeight: '44px',
    background: colors.activeGreen,
    border: `1px solid ${colors.activeGreenBorder}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: typography.fontFamily,
    fontWeight: 600,
    color: colors.activeGreenText,
  },
  btnMuted: {
    width: '100%',
    padding: '10px',
    minHeight: '44px',
    background: colors.activeRed,
    border: `1px solid ${colors.activeRedBorder}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: typography.fontFamily,
    fontWeight: 600,
    color: colors.activeRedText,
  },
  audioRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  slider: {
    flex: 1,
    height: '20px',
    cursor: 'pointer',
    accentColor: colors.primaryDark,
  },
};
