import { useRef, useEffect, useState } from 'react';
import Phaser from 'phaser';
import { PreloadScene } from '@/phaser/scenes/PreloadScene';
import { TrailScene } from '@/phaser/scenes/TrailScene';
import { CampScene } from '@/phaser/scenes/CampScene';

/**
 * Animation Panel — upper-right quadrant.
 * Embeds the Phaser canvas and manages the React-Phaser bridge.
 *
 * Scene chain: PreloadScene → TrailScene ↔ CampScene
 */
export default function AnimationPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<'initializing' | 'connected' | 'failed'>('initializing');

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#1a1a1a',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [PreloadScene, TrailScene, CampScene],
    };

    try {
      gameRef.current = new Phaser.Game(config);
    } catch (err) {
      console.error('Phaser initialization failed:', err);
      setBridgeStatus('failed');
    }

    // Phaser -> React event bridge: set connected when TrailScene confirms
    const onCampReady = () => {
      console.log('[Bridge] Phaser -> React: camp-ready');
      setBridgeStatus('connected');
    };

    if (gameRef.current) {
      gameRef.current.events.on('camp-ready', onCampReady);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.events.off('camp-ready', onCampReady);
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={containerRef} style={styles.container}>
      {bridgeStatus === 'failed' && (
        <div style={styles.error}>
          Phaser failed to initialize. Check console.
        </div>
      )}
      {bridgeStatus === 'connected' && import.meta.env.DEV && (
        <div style={styles.bridgeIndicator}>Bridge: Connected</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  error: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#c0392b',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  bridgeIndicator: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    color: '#4a9',
    fontSize: '11px',
    fontFamily: 'monospace',
    background: 'rgba(0, 0, 0, 0.6)',
    padding: '2px 6px',
    borderRadius: '3px',
  },
};
