# UI Hooks

**As of: 2026-06-07**

Custom React hooks for the Frontier game UI.

## Available Hooks

### `useIsMobile`
Detects whether the application is running on a mobile device based on screen width.

#### Usage:
```typescript
import { useIsMobile } from './useIsMobile';

function MyComponent() {
  const isMobile = useIsMobile();

  return (
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {/* ... */}
    </div>
  );
}
```

#### Implementation Details:
- Uses a 768px breakpoint to determine mobile vs desktop
- Implements responsive resize handling
- Returns a boolean value (`true` for mobile, `false` for desktop)

#### Type Definition:
```typescript
function useIsMobile(): boolean;
```

## Creating New Hooks

When adding new hooks to this directory:

1. Follow the naming convention: `use[Feature].ts`
2. Include comprehensive JSDoc comments
3. Export the hook as a named export
4. Add usage examples to this README
5. Document any dependencies or side effects

## Best Practices

1. **Performance**: Memoize expensive calculations within hooks
2. **Dependencies**: Clearly document any external dependencies
3. **Side Effects**: Minimize side effects and document any that exist
4. **Testing**: Ensure hooks are covered by unit tests
5. **Type Safety**: Provide complete TypeScript type definitions

## Future Hooks
- `useGameState`: Selector hook for game state
- `useAudio`: Audio control hook
- `useAnimation`: Animation control hook
- `useLocalStorage`: Persistence hook