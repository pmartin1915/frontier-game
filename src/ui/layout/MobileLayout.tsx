import { useState } from 'react';
import { useStore } from '@/store';
import { selectDailyCyclePhase } from '@/store/selectors';
import AnimationPanel from '@/ui/panels/AnimationPanel';
import MobileHudBar from '@/ui/layout/MobileHudBar';
import MobileModal from '@/ui/layout/MobileModal';
import MobileDaySheet from '@/ui/layout/MobileDaySheet';
import type { MobilePanel } from '@/ui/layout/MobileModal';

export default function MobileLayout() {
  const [activeModal, setActiveModal] = useState<MobilePanel | null>(null);
  const [showDaySheet, setShowDaySheet] = useState(false);
  const phase = useStore(selectDailyCyclePhase);

  return (
    <div style={styles.container}>
      {/* Phaser canvas fills entire viewport */}
      <div style={styles.canvas}>
        <AnimationPanel />
      </div>

      {/* Bottom HUD bar — always visible */}
      <MobileHudBar
        onOpenLog={() => setActiveModal('log')}
        onOpenMap={() => setActiveModal('map')}
        onOpenStats={() => setActiveModal('stats')}
        onOpenDayControls={() => setShowDaySheet(true)}
      />

      {/* Full-screen modal for Log/Map/Stats */}
      {activeModal && (
        <MobileModal
          activePanel={activeModal}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Day controls bottom sheet */}
      {showDaySheet && phase === 'idle' && (
        <MobileDaySheet onClose={() => setShowDaySheet(false)} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
    background: '#1a1a1a',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
  },
};
