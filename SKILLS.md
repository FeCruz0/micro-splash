SKILLS.md — Technical Skills, Architectural Standards & Guidelines

This document synthesizes the core technical competencies, architectural principles, patterns, and guidelines established during the project's migration and ongoing engine maintenance.

1. Technical Core Competencies

Modern Web & Graphics Engine Architecture

Engine Migration: Migrating legacy game engines (e.g., Kaboom.js APIs) to modern, web-standard renderers (PixiJS v8).

Single-Canvas Rendering Pipeline: Architectural separation of rendering backends using clean interface contracts (IRenderEngine, IRenderNode, IGraphicsNode).

Adapter & Facade Patterns: Writing robust adapters (RenderingContextAdapter) to mirror legacy API signatures while maintaining full dynamic type safety and backward compatibility.

State & Input Management

Unified Input Pipeline (InputStateManager): Decoupling physical input devices (Keyboard, Mouse, Touch, Gamepad) into a single-frame, deterministic input state snapshot.

Event Lifecycle Normalization: Handlers for key presses, key releases, pointer position mapping, canvas boundary offsets, and input-state persistence across frame resets.

Spatial Systems & Physics Simulation

Spatial Hash Grid: Efficient broad-phase spatial hash partitioning (spatialHashGrid.ts) for collision culling, rendering culling, and scalable entity queries.

Fluid Hydrodynamic Physics: Realistic oceanic buoyancy, water resistance (WATER_DRAG), ballistic jump gravity in air, and variable sink rates (SINK_RATE).

2. Engineering Guidelines & Coding Standards

Code Naming & Clarity (ai.rules)

Explicit Variable & Function Names: Strictly avoid cryptic or ambiguous abbreviations (e.g., use coordinateX, positionVector, deltaFrameTimeInSeconds instead of x, pos, dt).

Strict English Identifier Naming: All core codebase identifiers, interfaces, and variables must be written in explicit English.

Type Safety & Clean Architecture

Interface Segregation: Clear boundaries between engine subsystems via contract files (INTERFACE_CONTRACTS.ts).

Zero-Error Compilation: Strict adherence to TypeScript configurations with npx tsc --noEmit passing clean at 0 errors.

3. Performance & Memory Management

Frame Budget Monitoring: Frame rate tracking (FrameRateMonitor) and budget allocation tools (FrameBudgetMonitor) to maintain a target 60 FPS under heavy rendering loads.

Particle & Entity Pooling: Object pooling strategies for high-frequency short-lived entities (particles, krill, floating debris) to avoid GC spikes.

Spatial Culling & Family Ticking: Automatic visual offscreen culling and batched family updates (entityFamilyTicker.ts) for offscreen entities.

4. Verification & Testing Standards

Unit & Integration Testing: Comprehensive coverage using Vitest.

Deterministic Time Mocking: Testing time-dependent lifecycle events using mock tickers and controllable input state providers.

Regression Testing: Continuous validation of legacy proxy layers to prevent breaking changes across project phases.
