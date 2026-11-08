# Arsenal playground: UX restructure plan

Branch: `feat/arsenal-ux-restructure` · Status: proposal, nothing implemented yet · 2026-11-08

Goal: make Arsenal simple, clean and clear, and make the site itself as good as the components it
ships. The bar is the component library (fx, scene, motion, data-viz, PrecisionTaskCard): crafted,
cinematic, calm motion. Right now the shell around them looks like a generic dark template.

## 1. Audit (measured in the running app at 1440×900, deep-forge theme)

### Navigation and information architecture

- **Too many navigation layers at once.** The sidebar has 4 "Command Deck" links and 10
  "Arsenal Modules" links. On smaller screens all 14 show up as a horizontal row of chips. There is
  also a `CTRL K` hint. The 10 module pages all use the same template and are mostly static text.
- **The sidebar is not sticky.** It scrolls away with the page (on the home page it's gone after one
  scroll), while the module list inside it has its own nested scroll (`max-h-[calc(100vh-22rem)]`).
- **Some pages can't be reached from the nav.** `/task-card-prototype`, `/task-card-prototype/vault`
  and `/metrics-prototype` hold some of the best work in the repo and appear in no menu.
- **"Coming Soon" is a top-level tab** for features that don't exist yet: 3,367px of planned work.
- **Names don't match.** The same things are called "Vault", "weapons vault", "Developer Operating
  System", "Command Deck" and "Token Ops", and the Token Ops page itself is titled "Context
  Intelligence". The sidebar logo text is clipped ("ARSENA…").
- **Titles appear twice.** Every page has a sticky header with an H1 and a subtitle, then an
  in-page hero that repeats the same title (for example "Testing" then "Testing"). That costs about
  90px of permanent chrome.

### Components page (the core product)

- **Very long page:** 20,404px tall, 358 buttons, 11 live canvases running at once, 55 live cards.
- **Too much on each card:** 3 buttons (Copy / View Full Demo / Open Playground), Favorite and
  Fullscreen pills, tags, dependencies and a difficulty badge. That breaks the
  "compact card, one primary action" rule.
- **Category filters are broken:** 22 category chips, 9 of them empty (Navigation, Forms, Charts,
  Tables, Loading, 3D, SVG, React Flow, Experimental). The non-empty ones cover only 16 of the 55
  components, so 39 components can only be found under "All". The cause is that the showroom
  category map (`showroomMeta` in `ui-component-showcase.tsx`) and the catalog's own `category`
  field (12 real categories) have drifted apart.
- **Four view modes** (gallery / playground / blueprint / collections) are tiny pills that look
  the same as the filter chips.
- **Hero stat cards are noise:** "Favorites 0" and "Studio: gallery".
- **Some preview stages render blank or near-empty** (Skeleton, ErrorState, Tabs), so the components
  look worse than they are.
- **`CommandPalette` is mounted twice** on `/components` (in `app-providers.tsx` and again at
  `ui-component-showcase.tsx:1689`).

### Visual design

- **Light theme (ivory-graphite) is broken.** The shell paints a fixed dark vignette
  (`rgba(3,2,2,0.85)`), and there are about 40 hard-coded `white` / `black` / `zinc` classes in the
  app, so text washes out and previews stay dark. The toggle cycles through 3 named themes
  ("Theme: deep forge") rather than a clear light/dark switch.
- **The same background on every page:** NetworkBackground + grid + vignette, plus a second
  NetworkBackground inside each hero (2 canvases per page). There is no signature visual. The
  cinematic packages (`@arsenal/fx` Aurora/Galaxy/Infinity/MorphingSphere, `@arsenal/scene`) are
  never used by the site itself.
- **Hard-to-read labels:** uppercase micro-labels at 0.62–0.68rem with letter-spacing up to 0.3em,
  often `text-arsenal-muted/70`, all over the place.
- **Home hero is oversized and generic:** text up to 8xl inside a 75vh boxed card. The stats are
  hard-coded marketing numbers ("19 modules" while there are 45 packages; "85–98%" with no
  source). A wall of package pills follows.

### Motion and scroll

- `lenis` and `@arsenal/motion` (SmoothScroll, reveal, parallax, surface transitions, theme-reveal)
  are installed, but the app uses none of them apart from a single `ScrollReveal`.
- Pages switch with a hard cut (no route transitions). Scroll is the browser default plus CSS
  `scroll-behavior: smooth`.
- There is no shared section rhythm. Every page stacks bordered boxes with `space-y-8/10/16`.

## 2. Target structure

Five destinations instead of 14 nav items. Every page answers one question in its first viewport.

| Route                                      | Question it answers                          | Replaces                                                                |
| ------------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------- |
| `/` **Home**                               | "What is Arsenal and what's the best of it?" | Vault                                                                   |
| `/components` **Components**               | "Find, see and copy a component"             | Components (gallery)                                                    |
| `/components/[id]` **Component**           | "Everything about this one component"        | Fullscreen / playground modals                                          |
| `/modules` + `/modules/[slug]` **Modules** | "Which package do I import for X?"           | 10 sidebar module pages                                                 |
| `/labs` **Labs**                           | "Experiments and prototypes"                 | task-card, vault, metrics prototypes, Coming Soon (as a "Next" section) |
| `/context` **Context**                     | Live token / context dashboard               | Token Ops                                                               |

Old routes redirect (`/features/:slug` → `/modules/:slug`, `/coming-soon` → `/labs#next`,
`/*-prototype` → `/labs/...`), so no links break.

### Shell

- **Top bar instead of the sidebar:** a slim floating header (logo · 5 links · ⌘K search · light/dark
  toggle) on a solid enough backing. The active link gets a sliding indicator that moves between
  items (one shared `layoutId`), not a snap.
- **No page-title bar.** Each page's own hero is the only title, which removes the duplicate H1s.
- **⌘K is the power navigation:** it searches components, modules and pages. One palette, mounted
  once.
- **Mobile:** the same 5 links in a bottom sheet. No 14-chip row.

### Components page

- **Layout:** left rail with the 12 real catalog categories (straight from `UI_COMPONENT_CATALOG`,
  with counts, never an empty one), a sticky search bar, and a responsive grid of **compact
  cards**: live preview, name, one-line description. On hover: Copy and Open. Everything else
  moves to the detail page.
- **Detail page `/components/[id]`:** a large stage, props playground, code tab, dependencies,
  related components. The card travels into the detail page as a shared-element transition.
- Blueprints and Collections become **one "Patterns" tab** on the same page, styled as real tabs.
- **Performance:** previews mount when they scroll into view and pause off-screen (the motion gate
  already exists in the motion package). The aim is at most about 4 live canvases at any time.
- **Fix:** the blank previews and the double palette mount.

### Home (cinematic, one scroll story)

1. **Hero:** one signature living visual from `@arsenal/fx` / `@arsenal/scene` that becomes
   Arsenal's brand mark, full-bleed and masked into the page (no boxed card). Headline + 2 CTAs
   (Browse components / Import into a repo).
2. **"Best of" showcase:** 6 hand-picked live components in a horizontal pinned scroll, so the
   components sell themselves.
3. **How it works:** a scroll-driven pipeline (repo → rules → knowledge graph → budget → prompt)
   drawn with `AnimatedStrokeLoop`, replacing the `<pre>` block.
4. **Modules:** a compact grid of 10 cards linking to `/modules/[slug]`.
5. **Quick install** code block + footer.

Real numbers only: component and package counts come from the catalog and the workspace at build
time, and the unverified "85–98%" is removed or sourced from the context dashboard.

### Design system pass

- **Tokens only:** remove all hard-coded `white`/`black`/`zinc`/`rgba` from app code. The
  vignette and glows become theme tokens.
- **Light/dark toggle:** deep-forge (dark) and ivory-graphite (light). Light gets warm paper
  surfaces and soft shadows instead of glow. The theme-reveal transition from `@arsenal/motion` is
  used for the switch. obsidian-cyber stays available as an option rather than being removed.
- **Type scale:** display / title / body / label. The minimum label size goes to 0.72rem at full
  muted contrast, and letter-spacing is capped at 0.16em. Fewer boxes: sections are separated by
  space and hairlines, with cards only where something is clickable.
- **One accent (ember)** used surgically. Status colors keep their legend.

### Motion and scroll

- **Smooth scroll:** Lenis via `@arsenal/motion` SmoothScroll at the root, honouring reduced
  motion.
- **Route transitions:** a short fade/rise for content, the header stays put, and component cards
  use a shared-element transition into the detail page.
- **Scroll motion:** reveals on section entry (one shared preset, moderate pace) and numbers that
  count up with `AnimatedNumber`. Off-screen canvases are paused with the motion gate.

## 3. Phases (each one is a reviewable commit on this branch)

1. **Foundations:** tokens cleanup and light theme fix, type scale, a single CommandPalette mount,
   catalog-driven categories (fixes the 39 hidden components). Regression tests: every catalog
   entry is reachable through a category, and the palette is mounted once.
2. **Shell and routes:** new top bar, the 5 destinations, redirects, Labs page, title-bar removal.
3. **Components:** compact cards, `/components/[id]` detail, Patterns tab, lazy and paused previews.
4. **Home:** cinematic hero with a signature visual, best-of showcase, scroll pipeline, real stats.
5. **Motion polish:** Lenis, route and shared-element transitions, reduced-motion checks.
6. **Verify:** screenshots of every route in both themes at desktop and mobile widths, Lighthouse
   performance and accessibility, typecheck and tests.

## 4. Decisions for the owner

1. **Signature visual for the hero:** pick from the existing fx/scene pieces (Infinity particles,
   Morphing sphere, Aurora, Galaxy, scene glass rings) or have one designed.
2. **Navigation style:** top bar (recommended, more room for the work) or keep a slimmer, sticky
   sidebar.
3. **Coming Soon content:** fold it into Labs as "Next" (recommended) or drop it from the site.
4. **Brand voice:** keep the "weapons vault" language or move to plainer copy ("Arsenal — the
   component and tooling library for Oblivion Labs").
