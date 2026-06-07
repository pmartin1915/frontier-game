# UI Hooks

**Date:** 2026-06-07

## Overview
This directory contains custom React hooks that provide reusable logic for the Frontier UI components. Hooks encapsulate complex state management, side effects, and responsive behavior.

## Available Hooks

### `useIsMobile.ts`
Detects mobile devices and provides responsive layout switching.

**Features:**
- Uses `window.matchMedia` to detect mobile viewports
- Returns a boolean indicating mobile status
- Automatically updates when window is resized
- Includes debouncing to prevent rapid updates

**Usage:**
```typescript
import { useIsMobile } from './useIsMobile';

function MyComponent() {
  const isMobile = useIsMobile();

  return (
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {/* Component content */}
    </div>
  );
}
```

**Implementation Details:**
- Default breakpoint: 768px
- Debounce delay: 200ms
- Cleanup on unmount

## Best Practices
1. **Naming**: Hooks should be prefixed with `use` (e.g., `useMobileDetection`)
2. **Dependencies**: Clearly document all external dependencies
3. **Performance**: Include cleanup for effects and event listeners
4. **Testing**: Hooks should be unit tested independently of components
5. **Documentation**: Each hook should have JSDoc comments explaining:
   - Purpose
   - Parameters
   - Return value
   - Example usage

## Future Hooks
Potential hooks to implement:
- `useGameState` - Selector-based access to game state
- `useAudio` - Audio playback and volume control
- `useAnimation` - Animation timing and sequencing
- `useLocalStorage` - Persistent storage for settings
- `useKeyboardShortcuts` - Keyboard input handling