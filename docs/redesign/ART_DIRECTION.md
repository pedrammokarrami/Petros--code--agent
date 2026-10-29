CONCEPT: "Luminous scan". The world looks like a precise 3D scan of a real place, rendered as light: points only, no surfaces. Cold blue world; the only warm color is amber, reserved for live AI work.
INFLUENCES (understand, do not copy): Radiohead "House of Cards" (scan imperfection, people as point sculptures, dark void), TouchDesigner particle figures (density gradients, edge glow), AAA cinematics (depth of field, strong color contrast, one-key-light drama).

1. COLOR: bg #02040A with radial lift #06101F behind the focal object. Point ramp by brightness: #0A2E66 -> #1F6FEB -> #4FB8FF -> #DFF4FF (peak <1% of points). Signal amber #FFB454 ONLY for active work (monitors streaming code, the currently working agent, a running task), max 2% of points. Error #FF6B5B / success #3DDBA0 only as brief tints of the same points. Source assets lose ALL original colors: map luminance through the ramp (Look Lock).

2. POINT RENDER: soft gaussian sprites, additive, depthWrite off. Size 1.2-2.2px near, 0.5-1.0 far; alpha 0.08-0.30. Per-point normals drive rim brightness: b = base*(0.35 + 0.65*pow(1-abs(dot(n,v)),2)), so silhouettes glow like scans and volume reads instantly. Depth fog toward bg. Edges/contours 3x density, interiors sparse. Scan imperfection (STATIC, never animated): dropout patches on surfaces facing away from the key light, faint horizontal density banding on architecture, ~1cm depth jitter fixed per point. Density is never uniform.

3. COMPOSITION (every scene): one focal object on a thirds line, 40-60% negative space, 3 depth layers (foreground: large soft blurred points under 5% of density; mid: sharp hero; background: tiny dim points). Camera 35-50mm feel, slightly low three-quarter angle. No grid floor: the floor is a point disc dissolving radially into the void. Rooms are CUTAWAYS (furniture, floor contour, 1-2 partial wall planes), never closed boxes.

4. DEV ROOM (hero): long central desk cluster + 2 side desks, 5-6 people from ONE character pack, focal = lead engineer at the largest monitor wall, off-center. Whiteboard of sparse points with real task titles. Monitors glow amber and show real streamed code as point-text. One slow dolly-in (6% over 6s) on scene entry, then static. People: dense heads and hands, sparser torsos, no outlines, no cartoon colors, desynchronized typing offsets.

5. MOTION (meaningful only): scene change = points disperse along curl noise 0.5s, regather 1.2-1.6s, staggered by distance from the focal object, people materialize floor-to-top, easing cubic-bezier(0.22,1,0.36,1). Selection: others dim to 35%, selected brightens, camera pushes 6%. Idle = completely still. No pulsing, spinning, floating, rings, grids, neon glow, glassmorphism.

6. UI LANGUAGE: Vazirmatn (Persian) + Inter (Latin), scale 13/15/18/24/40/72. Labels are thin annotations: 1px leader line (max 45deg) from the object to a margin label, like a scientific figure. Panels near-opaque #060D1A, 1px border rgba(79,184,255,0.16), radius 10. Chat bar slim, on the same grid, never covering the focal object.

7. ASSET SELECTION (Scene Director must follow): ONE pack per category (people, office, store) for consistent proportions; normalize scale; clean silhouettes, human proportions, <=50k tris, no heavy glass/transparency; reject cartoonish proportions; people must have seated/typing/talking clips.

8. SELF-CHECK for every frame: one obvious focal point? 40%+ empty? individual points visible at 2x? amber under 2% and only on live work? would a still frame pass as a film frame? Any "no" means fix before moving on.
