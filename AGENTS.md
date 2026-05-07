# AGENTS.md

## Project Overview

Star Wanderer AI is a Next.js 16 / React 19 / TypeScript browser game. The app is a single-page, client-heavy space strategy prototype with most gameplay logic under `src/game`.

The codebase is intentionally prototype-like and AI-generated in places. Make small, scoped changes that fit existing patterns instead of broad rewrites.

## Main Commands

- Install dependencies: `npm install`
- Run locally: `npm run dev` (Next dev server on port `3000`, writes `dev.log`)
- Production build: `npm run build`
- Lint: `npm run lint`
- Type-check: `npm run type-check`

There is no dedicated test runner configured. For behavior changes, run at least `npm run type-check` and `npm run lint`; run `npm run build` when touching Next config, routing, assets, or anything likely to affect bundling.

## Architecture

- `src/app/page.tsx` is the main game screen and UI composition root.
- `src/app/layout.tsx` contains app metadata/layout shell.
- `src/app/globals.css` contains Tailwind imports plus global visual effects and planet styles.
- `src/game/store.ts` creates the Zustand store with `zustand/middleware/immer` and composes all slices.
- `src/game/slices/**` contains state mutations/actions split by feature area. Many slices delegate real logic to `helpers/**`.
- `src/game/types/**` contains shared game types. Update types close to the feature being changed.
- `src/game/constants/**` contains static gameplay data such as modules, goods, weapons, races, bosses, research, and planets.
- `src/game/components/**` contains game UI components. `src/components/ui/**` contains reusable Radix-style UI primitives.
- `src/lib/locales/ru.json` and `src/lib/locales/en.json` are the translation catalogs.
- `docs/**` documents gameplay systems and implementation status. Check these before changing a documented mechanic, and update docs if behavior changes.

## Coding Conventions

- Use TypeScript and keep `strict` compatibility. Avoid `any`, non-null assertions, and `@ts-comment`; ESLint rejects these.
- Use the `@/` path alias for imports from `src`.
- Prefer existing helper/slice patterns. For a new state action, add the public method to the relevant slice interface and put larger logic in `helpers`.
- Zustand slices receive `set` and often `get`. Mutating draft state inside `set` is expected because the store uses `immer`.
- Keep game calculations deterministic where possible. If adding randomness, follow nearby logic and make the random branch visible through logs/UI where appropriate.
- Keep data definitions in constants files rather than scattering literal gameplay values through components.
- Keep comments useful and short. Existing Russian comments are common; match surrounding language/style in the file you edit.
- Do not introduce server-only APIs into client components. The game UI is primarily `"use client"` code and relies on browser APIs such as `localStorage`.

## UI And Styling

- The visual style is retro terminal / space cockpit: dark background, neon green text, amber active states, bordered panels, compact controls.
- Tailwind utility classes are the default styling method. Preserve existing colors and panel language unless a task explicitly asks for redesign.
- Some visuals are rendered directly with HTML canvas. Important examples: `GalaxyMap`, `SectorMap`, `CombatShipVisual`, and `ExpeditionMapCanvas`. Keep canvas coordinate math, resize handling, overlays, and hit testing in sync when changing these components.
- Some icons and images use PNG sprite sheets from `public/assets/**`, including `ship.png`, `races.png`, `professions/*.png`, `stars.png`, `plantes/planets.png`, `plantes/gas-planets.png`, `stations.png`, `icons.png`, `icons-add.png`, `icons-crew.png`, and `expedition_locations.png`. Reuse the existing sprite helpers/components (`RaceSprite`, `ProfessionSprite`, `StatIcon`, `CrewStatusIcon`, `starSprites.ts`) before adding new image-loading code.
- Many labels are localized. When adding user-facing text, add both Russian and English keys in `src/lib/locales/ru.json` and `src/lib/locales/en.json`, then consume them through `useTranslation` / `t(...)`.
- Components should remain responsive across mobile and desktop. The main page uses a stacked layout on small screens and side-by-side panels on large screens.
- Prefer existing UI primitives from `src/components/ui/**` and existing game components before adding new component patterns.

## Gameplay Change Checklist

When changing a gameplay system:

1. Find the domain docs in `docs/**` first, if present.
2. Update the relevant type definitions in `src/game/types/**`.
3. Update constants/data in `src/game/constants/**`.
4. Implement state behavior in the matching `src/game/slices/**` helper/slice.
5. Update UI components only after the state/data path is clear.
6. Update translation files for visible text.
7. Update docs when the mechanic status or behavior changed.
8. Run `npm run type-check` and `npm run lint`.

## Important Local Notes

- `next.config.ts` has `typescript.ignoreBuildErrors: true`, so `npm run build` can miss type errors. Always use `npm run type-check` for type safety.
- `reactStrictMode` is disabled. Do not rely on Strict Mode double-invocation behavior.
- The project uses Tailwind CSS 4 via `@tailwindcss/postcss`; there is no traditional `tailwind.config.*` file.
- The package lock is committed. Keep dependency changes deliberate and include `package-lock.json` when dependencies change.
