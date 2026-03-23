import { useStore } from '@/store';
import { selectErrorMessage, selectToastMessage } from '@/store/selectors';
import { colors } from '@/ui/theme';

export default function ErrorToast() {
  const errorMessage = useStore(selectErrorMessage);
  const toast = useStore(selectToastMessage);

  // Legacy error path (backwards-compat with setError)
  const text = toast?.text ?? errorMessage;
  const type = toast?.type ?? 'error';

  if (!text) return null;

  const bg = type === 'success' ? colors.activeGreen : colors.activeRed;
  const border = type === 'success' ? colors.activeGreenBorder : colors.activeRedBorder;
  const fg = type === 'success' ? colors.activeGreenText : colors.activeRedText;

  return (
    <div
      role="status"
      aria-live="assertive"
      style={{
        ...styles.toast,
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
      }}
    >
      {text}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toast: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontFamily: "'Crimson Text', Georgia, serif",
    zIndex: 2000,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
  },
};
