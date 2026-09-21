# Katika.Bet frontend architecture

## Sprint 1

Katika.Bet is a client-side React + Vite single-page foundation. Wouter owns route matching and navigation; the shared `Shell` provides the responsive desktop header and mobile bottom navigation for product routes. The landing route intentionally has a focused marketing shell.

## PS5 Next-Gen Graphics Subsystem

The application features a PlayStation 5 console-grade visual pipeline:

1. **3D Avatar & Character Engine (`legend-avatar.tsx`)**:
   - Built on Three.js with `MeshPhysicalMaterial` PBR shaders (clearcoat, sheen, micro-roughness).
   - High-precision anatomical bust sculpting (cranium, jaw, nose, ears, traps, athletic kit torso).
   - Procedural fabric micro-normal weave textures for dynamic woven kit light scattering.
   - Dual-layer ocular system: high-definition textured iris + high-transmission cornea with specular catchlights.
   - Five-point cinematic stadium lighting rig (Warm Key, Mint Cyan Rim, Amber Gold Rim, Ambient Fill, Under-chin Bounce).
   - ACES Filmic Tone Mapping with SRGB color space and dynamic pointer-driven head tracking & breathing cycle.

2. **PS5 3D Inspect & Attribute Radar Modal (`ps5-inspect-modal.tsx`)**:
   - Interactive 360-degree turntable viewport with pointer/touch rotational orbit controls.
   - Real-time lighting presets (Stadium Floodlights, Golden Hour Spotlight, Cyber Arena Neon).
   - Camera lens presets (Face Closeup, Athlete Bust, Full Card Perspective).
   - Equilateral 3D Hexagon Attribute Radar (EA Sports FC Icon geometry) displaying all 6 core stats (PAC, SHO, PAS, DRI, DEF, PHY) with interactive gameplay trait inspection.

3. **Casino Floor & Card Fidelity**:
   - PS5 3D Milled Gold Coin with machined rim grooves, radial bullion luster, and volumetric stadium light beams.
   - Carbon-fiber chamfered emerald dice with recessed gold laser pips.
   - Linen air-cushion finish playing cards with gold foil embossed Katika backs and physical 3D drop shadows.

## Visual system

The visual direction is **quiet frontier & next-gen stadium**: deep charcoal surfaces, emerald primary, warm gold secondary, Space Grotesk display/body type, and DM Mono for system labels. Responsive behavior is mobile-first with a fixed bottom nav under the desktop breakpoint.