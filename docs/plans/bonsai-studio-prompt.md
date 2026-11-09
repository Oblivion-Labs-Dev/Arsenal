# Build brief: studio-quality 3D bonsai (Arsenal `@arsenal/three`)

Act as a principal real-time 3D engineer and technical artist. Build a bonsai tree for the
Arsenal monorepo that holds up from **any** angle: a full 360° turntable you can orbit, lit like
a product photo in a studio. It must look like a crafted collectible, not low-poly primitives.
Claude owns architecture, review and integration; Codex does the heavy implementation and the
texture generation (use `/codex-frontend` for code in its own worktree and `/codex-visual` for
textures and the screenshot review).

## Why this exists

The current `packages/three/src/hero/BonsaiTree.tsx` is a tube trunk plus flat-shaded sphere
"pads". From the front it reads as a toy, and from the side or back it falls apart. The owner
judged it "very bad". The reference look is the bonsai in the hero plate
(`apps/playground/public/assets/scene/plate-dark.webp` and `plate-light.webp`, left side): a
gnarled, twisting trunk with exposed roots, layered horizontal foliage clouds made of thousands
of small leaves, and warm rim light on dark moss and rock.

## Context to keep

- Stack: React Three Fiber 9.4, three 0.184, **no drei** (import helpers from
  `three/examples/jsm/...`), tsup build (`pnpm build` in `packages/three`). The playground
  consumes `dist`, so rebuild after every change.
- Shared contracts in `packages/three/src/hero/shared.ts`: `HeroGroupProps`, `HeroPieceProps`
  (`light`, `reducedMotion`), `HeroQuality` (`high | medium | low`), `useHeroEnv`, `heroTime`.
  `HeroStage` provides the camera, lights, ACES tone mapping, bloom and backdrop.
- Public API to keep: `<BonsaiTree quality light reducedMotion wind {...groupProps} />`. The
  root sits at the origin, and it must still compose inside `HeroStage` on the island.
  `patchBonsaiWind` and `bonsaiPadCount` are exported and unit-tested in
  `packages/three/tests/unit/hero.test.ts`; keep them working, or replace them with tested
  equivalents.
- Playground demo: `apps/playground/components/hero-piece-demos.tsx` (`'bonsai-tree'` entry) and
  `components/catalog-previews.tsx` (the Live 3D / Hero art toggle). The dev server is at
  http://localhost:3111/components/bonsai-tree.
- Free only: no paid APIs, models or assets. Generated textures come from Codex image
  generation (the owner approved using Codex for this task). Any downloaded asset must be CC0
  (for example Poly Haven) and gets the owner's OK before download.

## Requirements (in priority order)

### 1. Geometry that reads from every angle

Generate everything procedurally with a fixed seed, so the result is deterministic and testable.

- **Trunk and branches:** a space-colonization or hand-authored L-system skeleton, with the
  classic bonsai silhouette (informal upright, moyogi): an S-curving trunk that tapers strongly,
  3–4 main branch tiers alternating around the trunk in 3D (not only left/right), each splitting
  into secondary and tertiary twigs.
  - Sweep each segment as a tube with radius following pipe-model taper
    (r_parent² ≈ Σ r_child²), and keep tube junctions smooth so no seams show.
  - Add bark detail with low-frequency vertex displacement: twist, ridges, a couple of jin
    (dead-wood) stubs and one shari strip in pale silver-grey.
- **Nebari (roots):** 5–7 surface roots flaring into the soil and gripping a rock.
- **Foliage:** 6–10 cloud pads at the branch tips.
  - Each pad is a cluster of 150–400 **alpha-tested leaf cards**: small quads with a leaf-cluster
    texture, instanced, pointing outward from the pad centre with jitter. The cards keep their
    orientation; do not billboard them toward the camera, or the pads look fake when orbited.
  - Set normals to the pad's sphere normal (the "foliage normal" trick) so pads shade as soft
    volumes with a lit top and darker undersides.
  - Pads are flattened ellipsoids, denser on top and thinner below, with some sky gaps between
    them.
- **Base:** a shallow, unglazed dark-clay rectangular or oval bonsai pot on a small stand, with
  moss and a few stones on the soil. Offer it as a prop (`pot={false}` turns it off so the tree
  can sit on the island).
- **Budget:** `high` ≤ 120k triangles, `medium` ~60k, `low` ~25k. One draw call for the trunk,
  one or two for the leaves, and at most three for the pot and moss.

### 2. Materials and textures (Codex generates, Claude reviews)

- Use Codex image generation for tileable, text-free textures, saved to
  `packages/three/assets/bonsai/` and also copied into the playground's public folder:
  - Bark: albedo, normal and roughness at 1024².
  - Leaf cluster: an RGBA atlas at 1024² with 4 variants, including a translucency or
    thickness map.
  - Moss: albedo and normal.
  - Pot clay: albedo and roughness.
  - Compress all textures to WebP or KTX2.
- **Bark:** `MeshStandardMaterial` with triplanar or tube-UV mapping, so the texture never
  stretches along branches.
- **Leaves:** `MeshPhysicalMaterial` or a custom shader with alpha test, alpha-to-coverage
  (MSAA), subsurface-style backlight (a cheap wrap-lighting term plus a transmission tint), and
  per-instance hue and value jitter.
  - Palette: deep olive to sage in dark mode, matching the plate; a richer green in light mode.
- **Ambient occlusion:** baked per-vertex AO on the trunk, and per-instance AO on the leaves
  based on depth into the pad. Cheap, and it makes the tree look solid.

### 3. Studio presentation (a new `BonsaiStudio` wrapper, a separate export)

- Turntable: orbit with `OrbitControls` from `three/examples/jsm`, with damping.
  - Allow a full 360° horizontally, and from slightly below the horizon to near top-down.
  - Clamp the zoom, and slowly auto-rotate when idle; auto-rotate stops on interaction and
    resumes after 4 s.
- Lighting, like a product shoot:
  - Image-based light from `RoomEnvironment` (PMREM, free and built in), plus a key light, a rim
    light and a soft fill.
  - Soft shadows: `PCFSoftShadowMap` or VSM on the key light, and a contact-shadow plane under
    the pot. The contact shadow is a blurred depth render; implement it by hand, since there is
    no drei.
- Backdrop: a seamless studio sweep (a curved cyclorama) with a gentle vignette gradient.
  - Dark mode: deep charcoal with a warm amber light pool, matching `HeroBackdrop`'s palette.
  - Light mode: warm paper.
  - Never flat black or flat white.
- Post-processing: reuse the existing ACES and bloom setup; bloom stays subtle and only on
  highlights.

### 4. Motion

- Wind sways the pads in a vertex shader: low-frequency pad sway plus a high-frequency per-leaf
  flutter, with a 6–12 s feel. The trunk never moves.
- `wind={0}` and `reducedMotion` freeze it on a composed still. Pause the animation when the
  view is offscreen (IntersectionObserver or frameloop "demand").

### 5. Configurability

Every option keeps a sensible default:

- `seed`: a different tree from the same rules.
- `foliageDensity`.
- `pot`.
- `season`: optional `'summer' | 'autumn'` leaf tint.
- `quality`, `light`, `wind`.
- `BonsaiStudio` takes `autoRotate` and `background`.

### 6. Playground

- The bonsai page's Live 3D view uses `BonsaiStudio` (orbitable). The "Hero art" toggle stays.
- Add small controls on the page: seed, density, wind, and pot on/off.

## Constraints

- No new runtime dependencies beyond `three/examples/jsm`. Add no drei or postprocessing
  libraries without asking.
- Never remove the old geometry silently. Keep it as `quality="low"`, or as a `BonsaiTreeLite`
  fallback.
- Keep 60 fps on a mid laptop iGPU at `medium` quality, 1280×720.
- Never push, merge or deploy. Work on the branch `feat/studio-bonsai`, and stage files by path.
- Do not touch the unrelated failing test
  `app/task-card-prototype/artisan-clay-new-quest-card.test.ts`.

## Acceptance checks

1. **Unit tests** (vitest, `packages/three/tests/unit/`):
   - The skeleton is deterministic per seed.
   - Pipe-model taper holds within 5% at every split.
   - Triangle counts stay under budget for each quality level.
   - Leaf instances sit within their pad bounds.
   - The wind shader patch declares every uniform it reads.
2. Typecheck and tests pass:
   - `pnpm build`, `pnpm exec tsc --noEmit` and `pnpm exec vitest run` in `packages/three`.
   - `tsc --noEmit` in `apps/playground`.
3. **Real screenshots** from Chrome at http://localhost:3111/components/bonsai-tree:
   - Six views, in **both themes**: front, 90°, back, 270°, three-quarter from above, and a low
     angle.
   - The tree must read as a convincing bonsai in all six, with no visible card edges, seams,
     z-fighting or flat-shaded facets.
4. Codex visual review: run `/codex-visual` comparing the front view against the plate's bonsai
   crop. Iterate until it rates a close stylistic match.
5. No console errors or shader warnings, and fps logged at the medium and high quality levels.
6. A short report: what changed, the screenshots, the fps, and anything left undone.

## Suggested Codex split

1. Codex (frontend, worktree): the skeleton generator, tube mesher and nebari, with unit tests.
2. Codex (visual): generate the bark, leaf atlas, moss and clay textures; Claude checks they
   tile and contain no text.
3. Codex (frontend): the leaf-card instancing, foliage normals, leaf shader and wind.
4. Codex (frontend): `BonsaiStudio` (orbit, RoomEnvironment, shadows, cyclorama, contact
   shadow).
5. Claude: integrate into the playground, run the checks, take the six-angle screenshots in both
   themes, then send them to Codex (visual) for review. Repeat until the result passes.
