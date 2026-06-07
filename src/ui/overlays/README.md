# UI Overlays

**Date:** 2026-06-07

This directory contains all modal overlay components for the Frontier game. Overlays are rendered on top of the main layout and represent different game states or screens.

## Available Overlays

### `DecisionOverlay.tsx`
The daily decision screen where players choose their travel pace, discretionary actions, and whether to travel at night.

**Key Features:**
- Travel pace selection (Resting, Leisurely, Normal, Strenuous, Grueling)
- Discretionary action selection (None, Hunt, Forage, Rest, TendHorse)
- Night travel toggle
- Confirmation of choices

### `BargainOverlay.tsx`
Handles trading encounters where players can buy or sell supplies.

**Key Features:**
- Display of available trade offers
- Accept/reject options
- Supply quantity adjustment
- Price negotiation (future)

### `MorningBriefing.tsx`
The daily status report that appears each morning.

**Key Features:**
- Summary of previous day's journey
- Current player/horse status
- Supply levels
- Weather forecast
- Distance traveled and remaining

### `SaveLoadModal.tsx`
Handles game saving and loading functionality.

**Key Features:**
- Save game slots
- Load game from slots
- Delete saved games
- Confirmation dialogs

### `CampOverlay.tsx`
The camp management screen where players can perform actions during rest periods.

**Key Features:**
- Camp activity selection
- Supply management
- Player/horse status monitoring
- Time progression

### `GameEndScreen.tsx`
Displayed when the game ends (victory or defeat).

**Key Features:**
- Final statistics
- Outcome message
- Option to start new game
- Score display (future)

### `NewGameScreen.tsx`
Character creation and game initialization screen.

**Key Features:**
- Player name input
- Horse name input
- Difficulty selection (future)
- Game start confirmation

## Implementation Patterns

1. **State Management**: All overlays use the central game store for state management.

2. **Conditional Rendering**: Overlays are conditionally rendered based on game state (e.g., `pendingEncounter`, `gameEndState`).

3. **Accessibility**: Overlays include proper ARIA attributes and keyboard navigation support.

4. **Responsive Design**: All overlays adapt to different screen sizes.

5. **Animation**: Overlays include smooth transitions when appearing/disappearing.

## Usage Example

```typescript
// In App.tsx
return (
  <div style={styles.container}>
    {/* Main layout */}
    {isMobile ? <MobileLayout /> : <DesktopLayout />}

    {/* Overlays - rendered conditionally based on game state */}
    <MorningBriefing />
    <DecisionOverlay />
    <BargainOverlay />
    <SaveLoadModal />
    <CampOverlay />
    <GameEndScreen />
    <NewGameScreen />
  </div>
);
```

## Future Enhancements

1. **Overlay Stack**: Implement a proper overlay stack for handling multiple simultaneous overlays.

2. **Customization**: Allow players to customize overlay appearance.

3. **Tutorial Overlays**: Add guided tutorial overlays for new players.

4. **Performance**: Implement virtualization for overlays with large content.

5. **Localization**: Add support for multiple languages in overlay text.