# @arsenal/scene

Live layers for cinematic art-plate heroes. You draw (or generate) one still image of the scene, then
this package brings it to life in a single WebGL 1 pass: lake ripples, waterfall flow and mist, light
sweeping the glass rings, lights orbiting the rings, a twinkling core sphere and a beam pulsing down
into the island. Everything is placed by a `SceneMap` in plate pixels, so the same components fit any
plate with a new map.

It was extracted from the amsborse.github.io hero. `HERO_PLATE` is that plate's map. The scene is an
illustration, not a picture of any real system.

```ts
import { createSceneRenderer, fitPlate, HERO_PLATE } from "@arsenal/scene";

const renderer = createSceneRenderer(canvas, HERO_PLATE, { components: ["water", "falls", "orbits"] });
renderer.setImage(plateImg); // an <img> of the plate, decoded
renderer.resize(canvas.clientWidth * dpr, canvas.clientHeight * dpr);
const loop = (ms: number) => {
  renderer.render({ time: ms / 1000, light: false, outage: 0 });
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
```

`createSceneRenderer` throws if WebGL is missing or the shader fails, so keep the plate `<img>` as the
fallback and log the error. Pause the loop when the hero is offscreen or the user prefers reduced motion.

## Components

| Name | What moves |
|---|---|
| `water` | ripples spreading from `ripple` below `horizonY`, light rings on the surface |
| `falls` | streaks sliding down each `falls` box, mist drifting in `mist` |
| `rings` | light sweeping along the bright glass inside `rings` |
| `orbits` | two lights with tails per `orbits` ellipse, hidden behind the sphere on the far side |
| `sphere` | gold nodes twinkling on the core |
| `beam` | pulse travelling down the `beam` line into the island |

Optional: `modules: n` adds `n` glow points the app drives (`uMods`: x, y, highlight, failure;
`uRec`: recovery), and every frame can carry a request `packet`.

Helpers: `fitPlate` (cover-fit that keeps `focus` visible on phones), `platePercent` (CSS position for
hotspots), `orbitPoint` and `orbitLightAt` (where an orbit light is, to sync HTML with the shader).

## Develop

```sh
npm install
npm run check   # typecheck, unit tests, real-GPU browser tests, build
```

The browser tests draw the hero preset in Chromium and compare it pixel by pixel with the shader
the live hero ships (`tests/fixtures/hero-fragment.glsl`).
