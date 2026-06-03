# Frontier Game Engine

**Date:** 2026-06-03

The `src` directory contains the core game engine and UI components for Frontier.

## Directory Structure

```
src/
├── audio/          # Audio system modules
├── engine/         # Game logic and state management
├── store/          # State management (Redux/Zustand)
├── types/          # TypeScript type definitions
├── ui/             # User interface components
│   ├── components/ # Reusable UI components
│   ├── hooks/      # Custom React hooks
│   ├── layout/     # Layout components
│   └── overlays/   # Game overlay screens
└── App.tsx         # Main application component
```

## Core Components

### `App.tsx`
The main application component that initializes the game and renders the UI. Key features:

- Initializes core game systems (audio, auto-player)
- Dynamically switches between mobile and desktop layouts
- Renders all primary UI overlays and screens
- Includes development-only agent bridge for external tools

#### Agent Bridge (Development Only)
In development mode, the game exposes an API for external tools to:
- Observe game state changes
- Send commands to control the game
- Poll for state updates at regular intervals

## Game Initialization

The game initializes several core systems when the application loads:

1. **Auto-Player**: Handles automated game progression
2. **Audio System**: Manages ambient music and sound effects
3. **State Management**: Centralized store for game state

## UI Architecture

The UI is built with React and follows a component-based architecture:

- **Layouts**: `DesktopLayout` and `MobileLayout` for responsive design
- **Overlays**: Modal dialogs for game events (e.g., `DecisionOverlay`, `BargainOverlay`)
- **Components**: Reusable UI elements (e.g., `ErrorToast`, `ErrorBoundary`)

## Development Features

- **Error Boundary**: Catches and displays UI errors gracefully
- **Responsive Design**: Adapts to mobile and desktop screens
- **Agent Bridge**: Enables external tooling for development and testing

## Getting Started

1. Install dependencies: `npm install`
2. Run development server: `npm run dev`
3. Build for production: `npm run build`

For more detailed documentation on specific modules, see the README files in their respective directories.