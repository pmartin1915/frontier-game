/**
 * Frontier — Devil's Bargain Overlay
 *
 * Renders when a lethal encounter triggers a bargain offer.
 * Shows crisis, encounter description, cost, bargains-used counter.
 * Accept/Decline buttons → resolveBargainChoice(true/false).
 */

import { useStore } from '@/store';
import {
  selectPendingBargain,
  selectIsBargainActive,
  selectFailForwardsUsed,
} from '@/store/selectors';
import { MAX_FAIL_FORWARDS } from '@/types/encounters';

export default function BargainOverlay() {
  const bargain = useStore(selectPendingBargain);
  const active = useStore(selectIsBargainActive);
  const used = useStore(selectFailForwardsUsed);

  if (!active || !bargain) return null;

  const handleAccept = () => {
    useStore.getState().resolveBargainChoice(true);
  };

  const handleDecline = () => {
    useStore.getState().resolveBargainChoice(false);
  };

  return (
    <div style={styles.overlay} className="frontier-overlay">
      <div style={styles.card} className="frontier-bargain-card">
        <h2 style={styles.title}>{"Devil's Bargain"}</h2>
        <p style={styles.crisis}>{bargain.crisis}</p>
        <p style={styles.encounter}>{bargain.encounter}</p>

        <div style={styles.costBox}>
          <span style={styles.costLabel}>Cost</span>
          <span style={styles.costText}>{bargain.cost.description}</span>
        </div>

        <div style={styles.counter}>
          Bargains used: {used} / {MAX_FAIL_FORWARDS}
        </div>

        <div style={styles.buttons}>
          <button style={styles.acceptBtn} onClick={handleAccept}>
            Accept the Bargain
          </button>
          <button style={styles.declineBtn} onClick={handleDecline}>
            Decline — Face the Consequence
          </button>
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
    background: 'rgba(10, 5, 5, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
  },
  card: {
    background: '#2a1a10',
    border: '2px solid #8B2500',
    borderRadius: '8px',
    padding: '28px 32px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    boxShadow: '0 0 40px rgba(139, 37, 0, 0.4)',
    fontFamily: "'Crimson Text', Georgia, serif",
    color: '#e8dcc8',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#c44',
    margin: '0 0 12px 0',
    textAlign: 'center' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
  },
  crisis: {
    fontSize: '14px',
    color: '#b8a890',
    margin: '0 0 8px 0',
    fontStyle: 'italic',
    textAlign: 'center' as const,
  },
  encounter: {
    fontSize: '16px',
    lineHeight: '1.5',
    color: '#e8dcc8',
    margin: '0 0 20px 0',
    textAlign: 'center' as const,
  },
  costBox: {
    background: 'rgba(139, 37, 0, 0.2)',
    border: '1px solid #8B2500',
    borderRadius: '4px',
    padding: '12px 16px',
    margin: '0 0 16px 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  costLabel: {
    fontSize: '11px',
    color: '#c44',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    fontWeight: 700,
  },
  costText: {
    fontSize: '15px',
    color: '#e8a8a8',
    lineHeight: '1.4',
  },
  counter: {
    fontSize: '12px',
    color: '#8a7a6a',
    textAlign: 'center' as const,
    margin: '0 0 20px 0',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  acceptBtn: {
    padding: '12px 16px',
    background: '#8B2500',
    border: '1px solid #c44',
    borderRadius: '4px',
    color: '#e8dcc8',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Crimson Text', Georgia, serif",
    transition: 'background 0.15s',
  },
  declineBtn: {
    padding: '12px 16px',
    background: 'transparent',
    border: '1px solid #5a4a3a',
    borderRadius: '4px',
    color: '#8a7a6a',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: "'Crimson Text', Georgia, serif",
    transition: 'background 0.15s',
  },
};
