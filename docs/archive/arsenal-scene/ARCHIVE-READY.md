# arsenal-scene: ready to archive

`D:\1 - Projects\Projects\arsenal-scene` (`@amsborse/arsenal-scene` 0.1.0) has been fully absorbed
into `packages/scene` (`@arsenal/scene`). Archiving it loses nothing. This note lives in Arsenal
because the consolidation brief forbids modifying the source repositories. Nothing has been deleted
or archived; that is the owner's call.

Checked 2026-11-12 on branch `feat/consolidation-ports`.

## Why it is safe

- **The source has nothing unsaved.** Its working tree is clean. It has one branch, `main`, two
  commits (`06bff56`, `5d020e4`) and no remote, so no unpushed or remote-only work exists elsewhere.
- **Arsenal has everything the source has.** Every tracked source file exists in `packages/scene`:
  - 12 files are byte-identical (CRLF ignored);
  - the other 6 differ: the 3 code files (`fit.ts`, `index.ts`, `heroPlate.ts`) only by additions, and `package.json`, `tsconfig.json` and the README by the rename and monorepo settings (`jsx`, a `./react` export, workspace versions) (table below).
  - The one exception is `.gitignore`. Arsenal's root ignore covers `node_modules/` and `dist/`, but not `test-results/` or `playwright-report/`, so a local Playwright run leaves an untracked folder in `packages/scene` (follow-up: add both to the root ignore).
- **No live consumer depends on the source repository.**
  - The portfolio (`amsborse.github.io` and its two worktrees) installs
    `file:vendor/amsborse-arsenal-scene-0.1.0.tgz`, a tarball vendored into the portfolio itself, so
    its builds never read the arsenal-scene folder.
  - No other repository under `Projects/` references the package.

## Capability → location

| Capability                                                               | arsenal-scene              | Arsenal                                   | State                                              |
| ------------------------------------------------------------------------ | -------------------------- | ----------------------------------------- | -------------------------------------------------- |
| One-pass WebGL renderer (`createSceneRenderer`)                          | `src/renderer.ts`          | `packages/scene/src/renderer.ts`          | identical                                          |
| Fragment shader builder (water, falls, rings, orbits, sphere, beam)      | `src/fragment.ts`          | `packages/scene/src/fragment.ts`          | identical                                          |
| Component registry                                                       | `src/components/index.ts`  | `packages/scene/src/components/index.ts`  | identical                                          |
| Scene types (`SceneMap`, `Rect`, `Orbit`, …)                             | `src/types.ts`             | `packages/scene/src/types.ts`             | identical                                          |
| Plate fitting (`fitPlate`, `orbitPoint`, `orbitLightAt`, `platePercent`) | `src/fit.ts`               | `packages/scene/src/fit.ts`               | same, plus `fitCrop` (zoom onto one piece)         |
| Hero plate preset (`HERO_PLATE`)                                         | `src/presets/heroPlate.ts` | `packages/scene/src/presets/heroPlate.ts` | same, plus `HERO_PLATE_PIECES` / `PlatePiece`      |
| Public entry                                                             | `src/index.ts`             | `packages/scene/src/index.ts`             | same exports plus `fitCrop`, the pieces and camera |
| Unit tests, browser pixel-parity test, shader and plate fixtures         | `tests/**`                 | `packages/scene/tests/**`                 | identical                                          |
| Build and test config (`tsconfig.build.json`, `vitest`, `playwright`)    | root                       | `packages/scene/`                         | identical; `tsconfig.json` adapted to the monorepo |
| README                                                                   | `README.md`                | `packages/scene/README.md`                | renamed package in title and import                |
| Spring camera (`stepPose`, `cameraTarget`, …)                            | none                       | `packages/scene/src/camera.ts`            | Arsenal only                                       |
| React wrapper `<CinematicPlate>` (`@arsenal/scene/react`)                | none                       | `packages/scene/src/react/`               | Arsenal only; React is an optional peer            |

## Not migrated

- **The npm name `@amsborse/arsenal-scene`.** Arsenal publishes nothing under it; the package is
  `@arsenal/scene` (private). The portfolio keeps working from its vendored tarball. Moving the
  portfolio to `@arsenal/scene` is a separate change in that repository.
- **`package-lock.json`, `desktop.ini`, `dist/`, `node_modules/`, `test-results/`.** These are
  generated, machine-local or empty output.
- **Older toolchain pins** (vitest 3, `@types/node` 22, TypeScript ~5.7). Arsenal's workspace
  versions are used (vitest 4).

## Verification

Run from the Arsenal root on 2026-11-12:

| Command                                                                         | Result                                                                             |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `git -C ../arsenal-scene status --short`; `git remote -v`; `git branch -a`      | clean, no remote, `main` only, 2 commits                                           |
| File-by-file `diff --strip-trailing-cr` of every tracked source file            | 12 identical, 6 differ by additions or rename only, `.gitignore` not needed        |
| `grep -r "@amsborse/arsenal-scene"` across `Projects/` (excluding build output) | only the portfolio and its worktrees, all via the vendored tarball                 |
| `cd packages/scene && npx tsc --noEmit`                                         | passed                                                                             |
| `npx vitest run` (in `packages/scene`)                                          | 3 files, 22 tests passed (the source's 9 included)                                 |
| `npm run build` (in `packages/scene`)                                           | passed                                                                             |
| `npx playwright test` (in `packages/scene`)                                     | 4 passed: pixel parity dark and light, orbit motion, each component compiles alone |

To archive it, the owner can zip or move `arsenal-scene` out of `Projects/`, or delete it. Nothing in
Arsenal or the portfolio needs to change first.
