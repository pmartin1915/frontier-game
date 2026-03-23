import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store';
import {
  selectLogEntries,
  selectDailyCyclePhase,
} from '@/store/selectors';
import { colors } from '@/ui/theme';

/**
 * Travel Log panel — left column, full height.
 * Displays accumulated AI-generated narrative entries with day headers.
 * Auto-scrolls to the latest entry. New entries fade in.
 * Per GDD §8.2: Crimson Text, near-black on cream, WCAG AAA.
 */
export default function TravelLog() {
  const logEntries = useStore(selectLogEntries);
  const phase = useStore(selectDailyCyclePhase);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [animatedIdx, setAnimatedIdx] = useState<number>(-1);

  // Scroll to bottom and mark the newest entry for fade-in when entries change.
  useEffect(() => {
    if (logEntries.length > 0) {
      setAnimatedIdx(logEntries.length - 1);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logEntries.length]);

  const isComposing =
    phase !== 'idle' && phase !== 'briefing' && logEntries.length > 0;
  const isEmpty = logEntries.length === 0;
  const isWaiting = phase !== 'idle' && isEmpty;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>Travel Log</h2>
      </header>
      <div style={styles.content}>
        {isEmpty ? (
          <p style={styles.placeholder}>
            {isWaiting ? 'Composing entry\u2026' : 'The trail awaits. Begin a new day.'}
          </p>
        ) : (
          logEntries.map((entry, idx) => (
            <div key={idx}>
              {idx > 0 && (
                <div style={styles.divider}>{'\u2014 \u2726 \u2014'}</div>
              )}
              <div
                className={idx === animatedIdx ? 'log-entry--new' : undefined}
                style={styles.entryBlock}
                onAnimationEnd={() => {
                  if (idx === animatedIdx) setAnimatedIdx(-1);
                }}
              >
                <div style={styles.dayHeader}>
                  <span style={styles.dayLabel}>Day {entry.day}</span>
                  {entry.voice && (
                    <span style={styles.voiceBadge}>
                      {entry.voice.charAt(0).toUpperCase() + entry.voice.slice(1)}
                    </span>
                  )}
                  {entry.fallback && (
                    <span style={styles.fallbackBadge} title="Offline fallback entry">
                      offline
                    </span>
                  )}
                </div>
                <p style={styles.entry}>{entry.text}</p>
              </div>
            </div>
          ))
        )}
        {isComposing && (
          <div className="frontier-composing" style={styles.composing}>
            Composing entry{'\u2026'}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '24px',
    fontFamily: "'Crimson Text', 'Lora', Georgia, serif",
    color: colors.text,
    background: colors.base,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: `1px solid ${colors.borderLight}`,
    paddingBottom: '8px',
    flexShrink: 0,
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.primary,
    margin: 0,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  divider: {
    textAlign: 'center' as const,
    fontSize: '10px',
    color: colors.secondary,
    letterSpacing: '4px',
    padding: '8px 0',
    userSelect: 'none' as const,
  },
  entryBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  dayHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    paddingBottom: '4px',
    borderBottom: `1px solid ${colors.borderLight}`,
  },
  dayLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
  },
  voiceBadge: {
    fontSize: '11px',
    color: colors.primaryDark,
    fontStyle: 'italic',
    background: colors.button,
    padding: '1px 8px',
    borderRadius: '8px',
  },
  fallbackBadge: {
    fontSize: '10px',
    color: colors.connectionWarning,
    fontStyle: 'italic',
    background: colors.button,
    padding: '1px 6px',
    borderRadius: '8px',
    letterSpacing: '0.3px',
  },
  entry: {
    fontSize: '16px',
    lineHeight: '1.7',
    margin: 0,
  },
  placeholder: {
    fontSize: '16px',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  composing: {
    fontSize: '14px',
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: '12px 0',
  },
};
