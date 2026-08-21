# Directional Ship Hull Layout — Design

## Goal

Keep the existing free-form module grid, but make each valid layout read as a spaceship and make module position matter in combat. The ship gains a fixed nose-to-stern direction, a required cockpit-to-reactor-to-engine spine, exterior placement rules, and a small targeting consequence for exposed modules.

## Scope

- Keep the standard ship grid at `5×5`.
- Treat the top edge as the nose and the bottom edge as the stern.
- Require one connected, ordered cockpit-to-reactor-to-main-engine spine.
- Require clear exterior space in front of a cockpit, behind a main engine, and beside a weapon bay.
- Derive exterior modules from the current module rectangles.
- Add `+20` enemy target priority to exterior modules.
- Show direction, spine, exposure, valid drop state, and one concrete violation reason in the existing ship-grid UI.
- Update standard starting layouts to satisfy the rules.
- Preserve old saves without moving modules or adding persisted layout state.

## Non-goals

- No `7×7` default grid, rectangular grid, hull-size progression, or new hull cells.
- No module rotation, armor plates, corridors, doors, or separate construction mode.
- No local power network, section detachment, or automatic shutdown when a module is destroyed.
- No exposure damage multiplier or immunity for internal modules.
- No change to the existing one-module-per-turn movement limit.

## Layout rules

The grid has a permanent orientation: decreasing `y` points toward the nose and increasing `y` points toward the stern. Every installed module still has to fit inside the grid, avoid overlap, and belong to the same side-adjacent module graph.

A valid ship must contain at least one ordered, non-repeating adjacency path with:

1. a cockpit as the first critical module;
2. at least one reactor after the cockpit;
3. a main engine after the reactor.

The critical-module centers (`y + height / 2`) must also follow the ship direction: cockpit center `y` is less than reactor center `y`, and reactor center `y` is less than main-engine center `y`. Other modules may appear between those critical modules. Both existing propulsion types in `ENGINE_MODULE_TYPES` (`engine` and `pulse_drive`) qualify as a main engine.

A ship with multiple cockpits, reactors, or engines is valid when at least one such path exists. The chosen valid path is the displayed spine. When several paths qualify, use the shortest path and then compare the numeric module-ID sequences in order so the result is deterministic.

Critical placement rules use occupied unit-cell edges, including the footprint of modules larger than `1×1`:

- Every cockpit needs at least one exposed edge on its nose-facing side.
- Every propulsion module in `ENGINE_MODULE_TYPES` needs at least one exposed edge on its stern-facing side; that edge is its exhaust. At least one of them also closes the valid spine as its main engine.
- Every weapon bay needs at least one exposed edge on any of its four sides.
- Other module types have no directional placement rule.

`weaponShed` entries represent weapons rather than visible hull modules and are excluded from occupancy, adjacency, spine, and exposure analysis, matching the existing ship-grid renderer.

Disabled, manually disabled, damaged, and destroyed modules remain physical parts of the layout. Their footprints continue to connect the hull and block exterior edges. Combat damage therefore does not silently reshape the ship or invalidate its layout.

## Exterior modules and combat

A module is exterior when any unit edge of its footprint borders either an empty grid cell or space outside the grid. A module surrounded on all four sides by other module footprints is internal.

Enemy target selection keeps its current type, health, crew, and random priority terms. It adds exactly `20` priority points when the candidate module is exterior. This changes target likelihood without changing damage calculation:

```text
target priority = current priority + (exterior ? 20 : 0)
```

Only living modules remain target candidates, as today. Internal modules are not immune. Existing positional consequences, such as a damaged fuel tank harming adjacent modules when it explodes, remain unchanged.

## Shared analysis

Add one pure ship-layout analyzer under `src/game/modules/`. It receives `modules` and `gridSize` and returns derived data needed by every consumer:

- the deterministic spine module IDs;
- exterior module IDs;
- stable violation keys with localized-reason identifiers.

Violation keys identify both the rule and affected module where applicable, for example:

- `missing_spine`;
- `cockpit_front_blocked:<moduleId>`;
- `engine_exhaust_blocked:<moduleId>`;
- `weapon_exposure_blocked:<moduleId>`.

The analyzer stores nothing in `GameState`. Placement, rendering, combat targeting, and validation must call this shared logic rather than reimplementing geometry.

## Placement and legacy layouts

`canPlaceModule` continues to enforce grid bounds, overlap, and whole-ship connectivity. It additionally analyzes the current and prospective layouts.

- For a currently valid layout, a move or installation is accepted only when the prospective layout is also valid.
- For a legacy invalid layout, the prospective violation-key set must not contain a key absent from the current set.
- An existing violation may remain while the player clears space over several turns.
- Once a violation is fixed, a later move cannot reintroduce it.

This comparison allows old ships to remain playable and gradually converge on the new rules. It requires no save migration, compatibility flag, or automatic rearrangement. Standard starting templates are changed to valid layouts, so all new games start under strict validation.

Shop purchases, cargo installation, service installation, upgrades that reposition modules, and drag-and-drop movement already route through shared placement checks and must continue to do so. A placement search must skip candidates that add a layout violation.

## Ship-grid UI

The existing `ShipGrid` remains the only layout surface.

- Show `НОС ↑` / `NOSE ↑` above the grid.
- Show `КОРМА · ВЫХЛОП` / `STERN · EXHAUST` below it.
- Give modules on the selected spine a restrained shared highlight.
- Add green valid-drop feedback and red invalid-drop feedback.
- Show one highest-priority localized reason for an invalid drop instead of a generic failure.
- In `ModuleDetailDialog`, show either `внешний · приоритет цели +20` or `внутренний` for an installed player module.

The temporary module arrangement already used while dragging must drive the preview analysis, hull outline, spine highlight, and drop reason together. This keeps the preview consistent with the state mutation that follows.

## Localization and documentation

Add Russian and English strings for nose/stern labels, exposure status, and each placement violation. Add `docs/SHIP_LAYOUT.md` as the player/developer mechanic reference, including the rules, target-priority effect, and legacy-layout behavior.

## Verification

Add one focused Node assertion script for the pure analyzer and placement integration. It must cover:

- a valid cockpit-to-reactor-to-engine spine;
- a reactor on an unrelated branch not satisfying the spine;
- blocked cockpit front, engine exhaust, and weapon exposure;
- deterministic path choice with multiple valid critical modules;
- exterior and internal classification for `1×1` and `2×2` modules;
- the exact `+20` exterior targeting modifier;
- a valid layout rejecting a newly introduced violation;
- a legacy invalid layout retaining an existing violation but rejecting a new one;
- a fixed legacy violation being impossible to reintroduce;
- all production starting templates satisfying the new rules.

Run the focused script, the existing ship-hull geometry and new-game setup checks, `npm run type-check`, `npm run lint`, and `git diff --check`. Run `npm run build` because the change crosses client UI, gameplay modules, and localization imports.
