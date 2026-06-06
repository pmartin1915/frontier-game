# Frontier Game Engine

**Date:** 2026-06-06

The `src` directory contains the core implementation of the Frontier game, including the main application, game engine, UI components, and supporting systems.

## Directory Structure

```
src/
├── App.tsx                # Main application component
├── api/                   # API-related code (currently empty)
├── audio/                 # Audio system implementation
├── engine/                # Core game engine and mechanics
├── store/                 # State management
├── types/                 # TypeScript type definitions
├── ui/                    # User interface components
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── layout/            # Layout components
│   └── overlays/          # Game overlay screens
└── utils/                 # Utility functions
```

## Core Systems

### Main Application (`App.tsx`)
The entry point of the application that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout
- Renders all primary UI overlays and screens
- Handles responsive layout switching between mobile and desktop
- Includes development-only agent bridge for external tooling

### Audio System (`audio/`)
Manages all audio aspects of the game including:
- Ambient music with crossfading
- Sound effects (future)
- Volume control and muting

### Game Engine (`engine/`)
Contains the core game mechanics including:
- Auto-player system
- Daily cycle management
- Encounter resolution
- Game state progression

### State Management (`store/`)
Centralized state management using a custom store implementation that handles:
- Game state persistence
- State transitions
- Action dispatching

## Development Features

### Agent Bridge (Development Only)
In development mode, the application includes an agent bridge that:
- Exposes game state to external tools via HTTP POST to `/api/agent/state`
- Accepts commands from external tools via HTTP polling at `/api/agent/command`
- Supports actions like:
  - Setting auto-play mode
  - Dismissing overlays
  - Starting daily cycles
  - Making game decisions
  - Resolving encounters
  - Initializing new games

### Error Handling
- Global error boundary component
- Error toast notifications
- Graceful degradation when features fail

## UI Architecture

The UI is built with React and follows these principles:
- Responsive design with mobile/desktop layouts
- Overlay-based screen management
- Themed components with CSS-in-JS
- Custom hooks for common functionality

### Key UI Components
- `DecisionOverlay`: Handles daily decision making
- `BargainOverlay`: Manages trading and negotiation encounters
- `MorningBriefing`: Displays daily status updates
- `SaveLoadModal`: Handles game save/load functionality
- `CampOverlay`: Manages camp activities
- `GameEndScreen`: Shows game over/victory screens
- `NewGameScreen`: Initial game setup

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. For production builds:
```bash
npm run build
```

## Testing

The project includes:
- Unit tests for core game logic
- Integration tests for state management
- Manual testing for UI components

Run tests with:
```bash
npm test
```

## Future Development

- Complete implementation of the audio system
- Expansion of the game engine with more encounter types
- Enhanced save/load functionality
- Additional UI polish and animations
- Accessibility improvements
- Localization support