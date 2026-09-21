# Katika.Bet frontend architecture

## Sprint 1

Katika.Bet is a client-side React + Vite single-page foundation. Wouter owns route matching and navigation; the shared `Shell` provides the responsive desktop header and mobile bottom navigation for product routes. The landing route intentionally has a focused marketing shell.

## Hyperrealistic UHD 2D Graphics Subsystem

The application features a flat 2D ultra-high-definition (UHD) visual pipeline optimized for zero latency, maximum retina pixel density, and EA Sports FC Icon-grade photorealism:

1. **UHD 2D Athlete Portrait Engine (`legend-avatar.tsx`)**:
   - Sub-pixel retina canvas rendering supporting 1080p, 4K UHD, and 8K master density.
   - Micro-texture synthesis: breathable hexagonal jersey mesh weave, stitched metallic gold Katika shield crest, and dual-tone collar ribbing.
   - Hyperrealistic ocular and facial detail: dual stadium floodlight corneal catchlights, iris fiber rings, and multilayered subsurface skin tone scattering.
   - Volumetric dual-color stadium rim lighting (mint/cyan on left silhouette, warm champagne gold on right) with atmospheric floodlight cones and stadium dust particles.
   - Curated athlete archetypes spanning Finisher, Playmaker, Titan Defender, Speed Demon, and Golden Wall.

2. **UHD Studio Inspector & Precision Zoom Loupe (`ps5-inspect-modal.tsx`)**:
   - Interactive 3.2x zoom loupe for inspecting micro-weave fabric patterns, stitched crests, corneal reflections, and skin tone transitions.
   - Interactive Pixel Density Multiplier (Standard HD, 4K UHD, 8K Master) scaling rendered sub-pixel counts up to 6.9M+ pixels on demand.
   - Equilateral Hexagon Attribute Radar (EA Sports FC Icon geometry) with real-time PAC, SHO, PAS, DRI, DEF, PHY stat mapping.
   - Instant archetype switching and multi-environment studio lighting presets (Stadium Emerald, Golden Hour, Cyber Rim).

3. **Casino Floor & Card Fidelity**:
   - Milled gold bullion coins with machined radial luster.
   - Carbon-fiber chamfered emerald dice with laser gold pips.
   - Linen air-cushion finish playing cards with foil-stamped Katika crests and crisp retina typography.

## Visual system

The visual direction is **quiet frontier & next-gen stadium**: deep charcoal surfaces, emerald primary, warm gold secondary, Space Grotesk display/body type, and DM Mono for system labels. Responsive behavior is mobile-first with a fixed bottom nav under the desktop breakpoint.