# Penalty shootout engine

Rules are frozen. Do not change resolveShot while restyling.

- 3v3. User is team A. Stake in, pot stake*2 on win.
- Directions: left / centre / right.
- Score if shot direction !== keeper dive.
- Green composure ring (<20) still scores 42% of the time even if the keeper guesses.
- Red ring is >34. Yellow in between.
- Power is cosmetic (82-118 km/h) plus pitch low/mid/high/panenka. It does not change the score.
- Keeper control-all stays.

## Models (2026-10-05)

Scrap `/models/generic-striker.glb` and `/models/generic-keeper.glb`.

Presets must load:
- Striker: `https://threejs.org/examples/models/gltf/Soldier.glb`
- Keeper: `https://threejs.org/examples/models/gltf/Xbot.glb`

Rigged humanoids, free three.js examples. Not FIFA likenesses. Hide the capsule bodies when these load. A soccer-kit GLB can replace either URL later if it is yours to ship.
