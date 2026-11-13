# Cartoon 3D Penalty Shootout Engine (`soccer.io` Import)

Imported and customized from [`jainalokk/soccer.io`](https://github.com/jainalokk/soccer.io) under the MIT License (`src/games/penalty/THIRD_PARTY_LICENSE.md`).

## Preserved Core Mechanics
- **Ball Physics (`src/games/penalty/utils/Physics.ts`)**: Gravity, drag, turf bounce restitution, spin/curl, swept goal-line crossing, and goalpost/crossbar deflections.
- **Shooting & Goalkeeping (`src/games/penalty/utils/Controls.ts`, `Player.ts`, `Goalkeeper.ts`)**: Directional aiming with goal reticle, hold-to-charge oscillating power bar, striker sprint run-up synced to kick impact, difficulty-scaled AI dives (`1–100`), and manual keeper diving.
- **Game Modes**: Shootout vs AI, Local 2-Player (Pass-and-Play & Simultaneous `WASD` vs `Arrows`), Arcade Striker (`1–100`), and Arcade Keeper (`1–100`).
- **Shootout Rules**: 5 penalties per team with early-clinch checks and Sudden Death tiebreakers.

## Modular Asset Pipeline (`AssetManifest.ts` & `AssetManager.ts`)
Characters, teams, stadiums, balls, and sound effects are decoupled from gameplay logic:
- **3D Rigged Characters (`gltf`)**: Uses `/models/footballer-animated.glb` (`22` Mixamo animations including `Idle`, `Run`, `Sprint`, `Kick`, `GK_Dive`, `GK_Catch`, `Spin`, `Bicycle`, `Stumble`) with cel-shaded `MeshToonMaterial`, per-team kit tinting, hand-bone keeper gloves, and hair alpha fixes.
- **Animated 2D Sprite Sheets (`spritesheet`)**: Supports configurable `cols`, `rows`, `fps`, and per-state frame ranges (`SpriteMaterial`).
- **Procedural Cartoon Rig (`procedural-toon`)**: Instant fallback mascot rig.
- **Audio (`audioUrls`)**: Custom audio URLs (`whistle`, `kick`, `save`, `goal`, `post`, `miss`, `tick`, `win`) with Web Audio API procedural synthesis fallback.
