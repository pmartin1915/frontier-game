```markdown
# UI Hooks

Date: 2026-06-01

## `useIsMobile.ts`

Responsive layout detection hook.

### Usage
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

### Implementation Details
- Uses `window.matchMedia` to detect mobile viewport sizes
- Automatically updates when window is resized
- Defaults to desktop layout if media query cannot be evaluated
- Used by `App.tsx` to switch between `DesktopLayout` and `MobileLayout`
```