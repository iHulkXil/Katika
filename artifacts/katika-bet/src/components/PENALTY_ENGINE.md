# Penalty shootout engine

Rules are frozen. Do not change resolveShot while restyling.

- 3v3. User is team A. Stake in, pot stake*2 on win.
- Directions: left / centre / right.
- Score if shot direction !== keeper dive.
- Green composure ring (<20) still scores 42% of the time even if the keeper guesses.
- Red ring is >34. Yellow in between.
- Power is cosmetic (82-118 km/h) plus pitch low/mid/high/panenka. It does not change the score.
- Keeper control-all stays.

## Models (2026-10-06)

Keep only the official local `Footballer Animated` model (`/models/footballer-animated.glb`).
All other legacy/generic glb models have been purged.

Presets:
- Striker: `/models/footballer-animated.glb`
- Keeper: `/models/footballer-animated.glb`

Complete soccer kit humanoid rigged with 22 animations covering Striker actions (Idle, Run, Sprint, Kick, Pass, Bicycle) and Goalkeeper actions (GK_Dive, GK_Catch, GK_Miss). Capsule bodies are hidden when the 3D model loads.
