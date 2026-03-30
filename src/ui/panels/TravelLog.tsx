import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useStore } from '@/store';
import type { LogEntry as StoreLogEntry } from '@/store';
import {
  selectLogEntries,
  selectDailyCyclePhase,
} from '@/store/selectors';
import { colors } from '@/ui/theme';

/** Characters per second for typewriter reveal. */
const TYPEWRITER_CPS = 40;

/** Voice-specific font overrides for narrator entries. */
const VOICE_STYLES: Record<string, React.CSSProperties> = {
  adams:   { fontFamily: "'Crimson Text', 'Lora', Georgia, serif" },
  irving:  { fontFamily: "'Crimson Text', 'Lora', Georgia, serif", fontStyle: 'italic' },
  mcmurtry:{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", fontWeight: 600, letterSpacing: '-0.2px' },
};

// ============================================================
// MEMOIZED LOG ENTRY — prevents 40 CPS re-renders from touching
// historical entries that haven't changed.
// ============================================================

interface LogEntryProps {
  entry: StoreLogEntry;
  idx: number;
  isTyping: boolean;
  revealedChars: number;
  isAnimated: boolean;
  onAnimationDone: (idx: number) => void;
  onSkip: () => void;
}

const LogEntry = memo(function LogEntry({
  entry,
  idx,
  isTyping,
  revealedChars,
  isAnimated,
  onAnimationDone,
  onSkip,
}: LogEntryProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSkip();
      }
    },
    [onSkip],
  );

  return (
    <div>
      {idx > 0 && (
        <div style={styles.divider}>{'\u2014 \u2726 \u2014'}</div>
      )}
      <div
        className={isAnimated ? 'log-entry--new' : undefined}
        style={styles.entryBlock}
        onAnimationEnd={() => onAnimationDone(idx)}
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
        <p
          style={{
            ...styles.entry,
            ...(entry.voice ? VOICE_STYLES[entry.voice] : undefined),
          }}
          onClick={isTyping ? onSkip : undefined}
          onKeyDown={isTyping ? handleKeyDown : undefined}
          role={isTyping ? 'button' : undefined}
          tabIndex={isTyping ? 0 : undefined}
        >
          {isTyping ? entry.text.slice(0, revealedChars) : entry.text}
          {isTyping && <span style={styles.cursor}>|</span>}
        </p>
      </div>
    </div>
  );
});

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

  // Typewriter state: which entry is typing and how many chars are revealed
  const [typingIdx, setTypingIdx] = useState<number>(-1);
  const [revealedChars, setRevealedChars] = useState<number>(0);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Skip typewriter on click/key — reveal full text immediately
  const skipTypewriter = useCallback(() => {
    if (typingRef.current) {
      clearInterval(typingRef.current);
      typingRef.current = null;
    }
    setTypingIdx(-1);
    setRevealedChars(0);
  }, []);

  // Stable callback for animationEnd — avoids inline closure per entry
  const handleAnimationDone = useCallback((idx: number) => {
    setAnimatedIdx((prev) => (prev === idx ? -1 : prev));
  }, []);

  // Scroll to bottom and start typewriter when entries change.
  useEffect(() => {
    if (logEntries.length > 0) {
      const newIdx = logEntries.length - 1;
      setAnimatedIdx(newIdx);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

      // Fallback: clear animatedIdx if CSS animation doesn't fire
      const fallbackTimer = setTimeout(() => {
        setAnimatedIdx((prev) => (prev === newIdx ? -1 : prev));
      }, 1500);

      // Start typewriter for the newest entry
      const fullText = logEntries[newIdx]?.text ?? '';
      if (fullText.length > 0) {
        setTypingIdx(newIdx);
        setRevealedChars(0);

        // Clear any existing timer
        if (typingRef.current) clearInterval(typingRef.current);

        const intervalMs = 1000 / TYPEWRITER_CPS;
        let chars = 0;
        typingRef.current = setInterval(() => {
          chars++;
          if (chars >= fullText.length) {
            // Done typing
            if (typingRef.current) clearInterval(typingRef.current);
            typingRef.current = null;
            setTypingIdx(-1);
            setRevealedChars(0);
          } else {
            setRevealedChars(chars);
          }
        }, intervalMs);
      }

      return () => {
        clearTimeout(fallbackTimer);
        if (typingRef.current) {
          clearInterval(typingRef.current);
          typingRef.current = null;
        }
      };
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
            <LogEntry
              key={idx}
              entry={entry}
              idx={idx}
              isTyping={idx === typingIdx}
              revealedChars={revealedChars}
              isAnimated={idx === animatedIdx}
              onAnimationDone={handleAnimationDone}
              onSkip={skipTypewriter}
            />
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
  cursor: {
    color: colors.primary,
    fontWeight: 300,
    animation: 'blink 0.8s step-end infinite',
  },
};
