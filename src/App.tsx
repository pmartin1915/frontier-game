import { useState } from 'react';
import { Layout, Model } from 'flexlayout-react';
import type { TabNode } from 'flexlayout-react';
import type { IJsonModel } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import './ui/layout/frontier-theme.css';

import TravelLog from './ui/panels/TravelLog';
import AnimationPanel from './ui/panels/AnimationPanel';
import HUD from './ui/panels/HUD';
import MapPanel from './ui/panels/MapPanel';
import DecisionOverlay from './ui/overlays/DecisionOverlay';
import BargainOverlay from './ui/overlays/BargainOverlay';
import MorningBriefing from './ui/overlays/MorningBriefing';
import SaveLoadModal from './ui/overlays/SaveLoadModal';
import CampOverlay from './ui/overlays/CampOverlay';
import GameEndScreen from './ui/overlays/GameEndScreen';
import NewGameScreen from './ui/overlays/NewGameScreen';
import ErrorToast from './ui/components/ErrorToast';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { colors } from './ui/theme';
import { initAutoPlayer } from './engine/auto-player';
import { initAudio } from './audio';
import { store } from './store';

// Initialize the auto-player subscription once at module load.
// The player stays dormant until store.setAutoPlay(true) is called.
initAutoPlayer();

// Initialize the audio system (subscriptions + Howler context).
// No-op in non-browser environments.
initAudio();

// ---------------------------------------------------------------------------
// Dev-only: push game state to Vite agent bridge on every phase change.
// Allows external AI tools to observe state via GET /api/agent/state.
// Also polls GET /api/agent/command and executes queued actions.
// ---------------------------------------------------------------------------
if (import.meta.env.DEV) {
  // Push state snapshot whenever the daily cycle phase changes
  store.subscribe(
    (s) => s.dailyCyclePhase,
    () => {
      const s = store.getState();
      const snapshot = {
        dailyCyclePhase: s.dailyCyclePhase,
        gameInitialized: s.gameInitialized,
        autoPlay: s.autoPlay,
        gameEndState: s.gameEndState,
        player: { health: s.player.health, morale: s.player.morale, fatigue: s.player.fatigue, skills: s.player.skills },
        horse: { health: s.horse.health, fatigue: s.horse.fatigue, lameness: s.horse.lameness },
        supplies: s.supplies,
        world: { biome: s.world.biome, weather: s.world.weather, totalMiles: s.world.totalMiles },
        journey: { daysElapsed: s.journey.daysElapsed, waypoint: s.journey.waypoint, pace: s.journey.pace },
        pendingEncounter: s.pendingEncounter
          ? { id: s.pendingEncounter.id, name: s.pendingEncounter.name, choices: s.pendingEncounter.choices }
          : null,
      };
      fetch('/api/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      }).catch(() => { /* non-fatal */ });
    },
  );

  // Poll for commands queued by external AI agents
  const pollCommands = async () => {
    try {
      const resp = await fetch('/api/agent/command');
      if (!resp.ok) return;
      const { command } = await resp.json() as { command: unknown };
      if (!command) return;

      const cmd = command as Record<string, unknown>;
      const s = store.getState();
      switch (cmd.action) {
        case 'setAutoPlay':       s.setAutoPlay(Boolean(cmd.value)); break;
        case 'dismissOverlay':    s.dismissOverlay(); break;
        case 'startDailyCycle':   await s.startDailyCycle(); break;
        case 'setDailyDecisions': {
          const { Pace, DiscretionaryAction } = await import('./types/game-state');
          s.setDailyDecisions(
            (cmd.pace as typeof Pace[keyof typeof Pace]) ?? Pace.Normal,
            (cmd.discretionaryAction as typeof DiscretionaryAction[keyof typeof DiscretionaryAction]) ?? DiscretionaryAction.None,
            Boolean(cmd.nightTravel),
          );
          break;
        }
        case 'resolveEncounterChoice': await s.resolveEncounterChoice(String(cmd.choiceId)); break;
        case 'resolveBargainChoice':   await s.resolveBargainChoice(Boolean(cmd.accepted)); break;
        case 'initializeGame':
          s.initializeGame(String(cmd.playerName ?? 'Martin'), String(cmd.horseName ?? 'Horse'));
          break;
        default:
          console.warn('[agent-bridge] Unknown command:', cmd.action);
      }
    } catch { /* non-fatal */ }
  };

  setInterval(pollCommands, 1500);
}

/**
 * Root layout: free-form docking via flexlayout-react.
 *
 * Default arrangement matches GDD §8.1:
 *   Left column:  Travel Log (full height)
 *   Right column: Animation (top), HUD (middle), Map (bottom)
 *
 * All panels are draggable — drag a tab to rearrange, split,
 * or dock into any position. Double-click maximize button to
 * expand a panel.
 */

const LAYOUT_JSON: IJsonModel = {
  global: {
    tabEnableClose: false,
    tabEnableRename: false,
    tabSetEnableMaximize: true,
    tabSetEnableSingleTabStretch: true,
    splitterSize: 6,
    splitterEnableHandle: true,
    tabSetMinHeight: 60,
    tabSetMinWidth: 60,
  },
  layout: {
    type: 'row',
    children: [
      {
        type: 'tabset',
        weight: 50,
        children: [
          { type: 'tab', name: 'Travel Log', component: 'travelLog' },
        ],
      },
      {
        type: 'row',
        weight: 50,
        children: [
          {
            type: 'tabset',
            weight: 50,
            children: [
              { type: 'tab', name: 'Animation', component: 'animation' },
            ],
          },
          {
            type: 'tabset',
            weight: 25,
            children: [
              { type: 'tab', name: 'HUD', component: 'hud' },
            ],
          },
          {
            type: 'tabset',
            weight: 25,
            children: [
              { type: 'tab', name: 'Map', component: 'map' },
            ],
          },
        ],
      },
    ],
  },
};

/** Map component IDs to React elements. */
function panelFactory(node: TabNode): React.ReactNode {
  switch (node.getComponent()) {
    case 'travelLog':
      return <TravelLog />;
    case 'animation':
      return (
        <div style={{ background: colors.text, width: '100%', height: '100%' }}>
          <AnimationPanel />
        </div>
      );
    case 'hud':
      return (
        <div style={{ padding: '12px', overflow: 'auto', height: '100%' }}>
          <HUD />
        </div>
      );
    case 'map':
      return (
        <div style={{ padding: '12px', overflowY: 'auto', height: '100%' }}>
          <MapPanel />
        </div>
      );
    default:
      return null;
  }
}

export default function App() {
  const [model] = useState(() => Model.fromJson(LAYOUT_JSON));

  return (
    <ErrorBoundary>
      <div style={styles.container}>
        <Layout model={model} factory={panelFactory} />
        <MorningBriefing />
        <DecisionOverlay />
        <BargainOverlay />
        <SaveLoadModal />
        <CampOverlay />
        <GameEndScreen />
        <NewGameScreen />
        <ErrorToast />
      </div>
    </ErrorBoundary>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    position: 'relative',
  },
};
