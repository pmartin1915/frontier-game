import { useStore } from '@/store';
import {
  selectPlayerHealth,
  selectPlayerMorale,
  selectWater,
  selectFood,
  selectCoffee,
  selectAmmo,
  selectDaysElapsed,
  selectTotalMiles,
  selectHorseHealth,
  selectConsecutiveFallbacks,
  selectCompanions,
  selectTransportMode,
  selectWaterCapacity,
  selectFoodCapacity,
  selectAutoPlay,
  selectGameInitialized,
  selectAudioPrefs,
} from '@/store/selectors';
import { CHARACTER_BIBLES } from '@/types/companions';
import { CONSECUTIVE_FALLBACK_WARNING_THRESHOLD } from '@/types/narrative';
import { SfxEvent } from '@/types/audio';
import DayControls from '@/ui/components/DayControls';
import HelpCard from '@/ui/components/HelpCard';
import MiniBar from '@/ui/components/MiniBar';
import { colors, resourceColor } from '@/ui/theme';

/**
 * HUD panel — middle-right.
 * Displays vital stats using atomic selectors.
 * Per GDD §8.2: Near-black on cream, high contrast.
 */
export default function HUD() {
  const health = useStore(selectPlayerHealth);
  const morale = useStore(selectPlayerMorale);
  const water = useStore(selectWater);
  const food = useStore(selectFood);
  const coffee = useStore(selectCoffee);
  const ammo = useStore(selectAmmo);
  const days = useStore(selectDaysElapsed);
  const miles = useStore(selectTotalMiles);
  const horseHealth = useStore(selectHorseHealth);
  const fallbacks = useStore(selectConsecutiveFallbacks);
  const companions = useStore(selectCompanions);
  const transport = useStore(selectTransportMode);
  const waterCap = useStore(selectWaterCapacity);
  const foodCap = useStore(selectFoodCapacity);
  const autoPlay = useStore(selectAutoPlay);
  const gameInitialized = useStore(selectGameInitialized);
  const audioPrefs = useStore(selectAudioPrefs);

  const activeCompanions = companions.filter((c) => c.status === 'active');

  return (
    <div style={styles.container}>
      {gameInitialized && <HelpCard />}
      <div style={styles.row}>
        <Stat label="Day" value={days} />
        <Stat label="Miles" value={miles} />
        <BarStat label="Health" value={health} warn={health < 40} />
        <BarStat label="Morale" value={morale} warn={morale < 30} />
      </div>
      <div style={styles.row}>
        <CapStat label="Water" value={water} cap={waterCap} warn={water < 10} />
        <CapStat label="Food" value={food} cap={foodCap} warn={food < 10} />
        <Stat label="Coffee" value={coffee} warn={coffee === 0} />
        <Stat label="Ammo" value={ammo} />
      </div>
      <div style={styles.row}>
        <BarStat label="Horse" value={horseHealth} warn={horseHealth < 40} />
        <div style={styles.stat}>
          <span style={styles.label}>Transport</span>
          <span style={styles.transportValue}>{transport}</span>
        </div>
      </div>
      {activeCompanions.length > 0 && (
        <div style={styles.companionSection}>
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
        </div>
      )}
      {fallbacks >= CONSECUTIVE_FALLBACK_WARNING_THRESHOLD && (
        <div style={styles.connectionWarning}>
          Connection unstable
        </div>
      )}

      {gameInitialized && (
        <button
          type="button"
          style={autoPlay ? styles.autoPlayBtnActive : styles.autoPlayBtn}
          onClick={() => useStore.getState().setAutoPlay(!autoPlay)}
        >
          {autoPlay ? 'Auto Play: ON' : 'Auto Play: OFF'}
        </button>
      )}

      <button
        type="button"
        style={styles.journalBtn}
        onClick={() => {
          useStore.getState().triggerSfx(SfxEvent.Click);
          useStore.getState().toggleSaveLoadModal();
        }}
      >
        Journal
      </button>

      {/* Audio controls */}
      <div style={styles.audioSection}>
        <span style={styles.audioLabel}>Audio</span>
        <div style={styles.audioRow}>
          <span style={styles.audioSliderLabel} title="Master volume">M</span>
          <input
            aria-label="Master volume"
            type="range" min={0} max={1} step={0.05}
            value={audioPrefs.master}
            style={styles.audioSlider}
            onChange={(e) => useStore.getState().setAudioPref('master', e.target.valueAsNumber)}
          />
        </div>
        <div style={styles.audioRow}>
          <span style={styles.audioSliderLabel} title="Music volume">♪</span>
          <input
            aria-label="Music volume"
            type="range" min={0} max={1} step={0.05}
            value={audioPrefs.music}
            style={styles.audioSlider}
            onChange={(e) => useStore.getState().setAudioPref('music', e.target.valueAsNumber)}
          />
        </div>
        <div style={styles.audioRow}>
          <span style={styles.audioSliderLabel} title="Sound effects volume">≋</span>
          <input
            aria-label="Sound effects volume"
            type="range" min={0} max={1} step={0.05}
            value={audioPrefs.sfx}
            style={styles.audioSlider}
            onChange={(e) => useStore.getState().setAudioPref('sfx', e.target.valueAsNumber)}
          />
        </div>
        <button
          type="button"
          style={audioPrefs.muted ? styles.muteBtnActive : styles.muteBtn}
          onClick={() => {
            useStore.getState().triggerSfx(SfxEvent.Click);
            useStore.getState().setAudioPref('muted', !audioPrefs.muted);
          }}
        >
          {audioPrefs.muted ? 'Unmute' : 'Mute'}
        </button>
      </div>

      <DayControls />
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div style={styles.stat}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...styles.value, color: warn ? resourceColor(value) : colors.text }}>{value}</span>
    </div>
  );
}

/** Stat with a fill bar beneath the number for at-a-glance status. */
function BarStat({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div style={styles.stat}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...styles.value, color: warn ? resourceColor(value) : colors.text }}>{value}</span>
      <MiniBar label="" value={value} width="100%" height={6} />
    </div>
  );
}

function CapStat({ label, value, cap, warn = false }: { label: string; value: number; cap: number; warn?: boolean }) {
  const pct = cap > 0 ? (value / cap) * 100 : 0;
  return (
    <div style={styles.stat}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...styles.value, color: warn ? resourceColor(pct) : colors.text }}>{value}/{cap}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontFamily: "'Crimson Text', Georgia, serif",
    fontSize: '14px',
  },
  row: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '48px',
  },
  label: {
    fontSize: '11px',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  value: {
    fontSize: '18px',
    fontWeight: 600,
  },
  transportValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.text,
    textTransform: 'capitalize' as const,
  },
  autoPlayBtn: {
    width: '100%',
    padding: '6px 12px',
    background: colors.button,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'Crimson Text', Georgia, serif",
    color: colors.textMuted,
    marginTop: '4px',
  },
  autoPlayBtnActive: {
    width: '100%',
    padding: '6px 12px',
    background: colors.activeGreen,
    border: `1px solid ${colors.activeGreenBorder}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'Crimson Text', Georgia, serif",
    color: colors.activeGreenText,
    fontWeight: 600,
    marginTop: '4px',
  },
  journalBtn: {
    width: '100%',
    padding: '6px 12px',
    background: colors.button,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: "'Crimson Text', Georgia, serif",
    color: colors.primaryDark,
    fontWeight: 600,
    marginTop: '4px',
  },
  connectionWarning: {
    fontSize: '11px',
    color: colors.connectionWarning,
    fontStyle: 'italic',
    textAlign: 'center' as const,
    marginTop: '4px',
  },
  companionSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    borderTop: `1px solid ${colors.borderLight}`,
    paddingTop: '8px',
    marginTop: '4px',
  },
  companionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  companionName: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.primaryDark,
    minWidth: '60px',
  },
  audioSection: {
    borderTop: `1px solid ${colors.secondary}`,
    paddingTop: '6px',
    marginTop: '4px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '3px',
  },
  audioLabel: {
    fontSize: '10px',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  audioRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  audioSliderLabel: {
    fontSize: '12px',
    color: colors.textMuted,
    width: '14px',
    textAlign: 'center' as const,
    flexShrink: 0,
  },
  audioSlider: {
    flex: 1,
    height: '20px',
    cursor: 'pointer',
    accentColor: colors.primaryDark,
  },
  muteBtn: {
    width: '100%',
    padding: '4px',
    background: colors.button,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: "'Crimson Text', Georgia, serif",
    color: colors.textMuted,
    marginTop: '2px',
  },
  muteBtnActive: {
    width: '100%',
    padding: '4px',
    background: colors.activeRed,
    border: `1px solid ${colors.activeRedBorder}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: "'Crimson Text', Georgia, serif",
    color: colors.activeRedText,
    fontWeight: 600,
    marginTop: '2px',
  },
};
