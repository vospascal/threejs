# Three.js VR Island Experience

A modular Three.js VR experience featuring a floating island with teleportation controls.

## 🏗️ Project Structure

The project follows Three.js best practices with a modular folder structure:

```
src/
├── components/          # Main application components
│   └── VRApp.ts        # Main VR application orchestrator
├── controls/           # Input handling and controls
│   ├── DesktopControls.ts  # WASD + pointer lock controls
│   └── VRControls.ts       # VR controller handling
├── loaders/            # Asset loading utilities
│   └── GLTFAssetLoader.ts  # GLTF model loader
├── scenes/             # Scene setup and management
│   └── IslandScene.ts     # Island scene configuration
├── types/              # TypeScript type definitions
│   └── index.ts           # Shared interfaces and types
├── utils/              # Utility functions
│   └── RendererUtils.ts   # Renderer setup utilities
├── index.ts            # Barrel exports
└── main.ts            # Application entry point
```

## 🚀 Features

- **Desktop Controls**: WASD movement with pointer lock
- **VR Support**: Full WebXR compatibility with controller tracking
- **Teleportation**: Point-and-click teleportation in VR
- **Smooth Rotation**: Thumbstick rotation in VR
- **Asset Loading**: GLTF model loading with proper positioning
- **TypeScript**: Full type safety with proper interfaces

## 🎮 Controls

### Desktop
- **W/A/S/D** or **Arrow Keys**: Movement
- **Mouse**: Look around (click to enable pointer lock)

### VR
- **Controller Triggers**: Teleportation (point and trigger)
- **Right Thumbstick**: Smooth rotation
- **Natural Movement**: Room-scale tracking

## 🔧 Components Overview

### VRApp
The main application class that orchestrates all components and manages the render loop.

### DesktopControls
Handles keyboard input and pointer lock controls for desktop experience.

### VRControls
Manages VR controllers, teleportation system, and smooth rotation.

### IslandScene
Configures the 3D scene with lighting, background, and helper objects.

### GLTFAssetLoader
Handles loading and positioning of 3D models with proper scaling and centering.

### RendererUtils
Utility functions for renderer setup and window resize handling.

## 🛠️ Development

### Prerequisites
- Node.js
- pnpm (or npm/yarn)

### Setup
```bash
pnpm install
pnpm dev
```

### Build
```bash
pnpm build
```

## 📦 Dependencies

- **three**: Core Three.js library
- **@types/three**: TypeScript definitions for Three.js

## 🌟 Architecture Benefits

1. **Modularity**: Each component has a single responsibility
2. **Reusability**: Components can be easily reused or extended
3. **Maintainability**: Clean separation of concerns
4. **Type Safety**: Full TypeScript support with proper interfaces
5. **Scalability**: Easy to add new features or modify existing ones

## 🔄 Extending the Project

To add new features:

1. **New Scenes**: Add classes to `src/scenes/`
2. **New Controls**: Add classes to `src/controls/`
3. **New Assets**: Add loaders to `src/loaders/`
4. **New Components**: Add to `src/components/`
5. **New Types**: Add interfaces to `src/types/`

Each new module should follow the established patterns for consistency and maintainability.