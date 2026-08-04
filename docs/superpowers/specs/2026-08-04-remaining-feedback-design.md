# Remaining player-feedback fixes — design

## Scope

Complete the remaining reported items 1–10 in four independently releasable packages. The previously delivered combat-round fix (items 11–12) is not changed by this work.

## Decisions

- A bounty contract (`Охота на пирата`) expires 12 strategic turns after acceptance.
- The random event currently called `Космический шторм` is renamed `Энергетический фронт`; map locations retain the `Космический шторм` name.
- The random-event protection option reuses the existing storm-shield research condition and its 50% damage reduction. It is disabled with an explanation when the technology is absent.
- Existing artifact-found dialog behavior remains unchanged. An artifact tile that yields no artifact instead gets a persistent, in-panel empty-result message.
- No new dependencies, screens, or separate settings flows are introduced.

## Package A: Canonical status, bounty deadline, and xenosymbiont merge (items 5, 8, 10)

`ShipStats` is the canonical status display because it already calls `getTotalEvasion()` and `getCrewCapacity()`. `ShipStatsPanel`, which is embedded in the unknown-object flow, must use those same store getters instead of locally deriving evasion from pilot level and reporting healthy crew over total crew. Both places therefore show the same total evasion and `crew.length / getCrewCapacity()`.

The merge UI already offers the action to all xenosymbionts and `canMergeWithModule()` has no profession limit. The assignment validator is the conflicting rule. The validator will allow `merge` only when the crew member is an unmerged xenosymbiont and the selected module has a supported merge effect; all other assignment validation stays unchanged.

The planet-contract generator receives one bounty-specific deadline constant of 12 turns. Existing deadline presentation and expiry processing remain the single source of truth.

## Package B: Expedition feedback and crew selection (items 7, 9)

An artifact tile records an explicit empty outcome when `tryFindArtifact()` returns no artifact. `PlanetExplorationPanel` renders that outcome in the existing expedition view with an `aria-live` message and a stable tile/result indicator. A successful find continues through the existing delayed artifact dialog, so dialogs never stack.

Before launching an expedition, the panel always lists the crew currently eligible for selection. A fatigued member remains visible but disabled, with the exact reason and remaining recovery turns. The existing start helper remains authoritative and filters fatigued IDs defensively. Synthetic crew is described as not accumulating assignment fatigue; it is not silently excluded.

## Package C: Contract outcomes, levels, and crew-card clarity (items 1, 3, 4, 6)

Contract completion becomes a snapshot, not a UI reconstruction. At the exact mutation path that grants rewards, capture the actual credit award, every reputation delta, and each crew member's final experience award after multipliers. Queue that result next to the pending completion contract. The modal renders only this recorded result, which prevents a later state change from changing the completed mission's report.

Experience application emits a queued level-up result whenever a crew member levels. It includes old and new levels plus actual changed values (currently maximum health and restored health). A normal level shows a compact result dialog. At levels 3, 6, and 9, that same dialog continues directly to the existing talent-choice interaction. Multiple results are displayed sequentially after the contract result rather than stacking dialogs.

Crew cards show `Опыт: current / required-for-next-level` beside their progress bar. The fatigue label gets a tooltip that explains its gameplay effect, ordinary recovery through rest/unassignment, and the synthetic exception. Its numbers come from the existing fatigue-state helper; this package does not retune fatigue rules.

## Package D: Event clarity and storm-shield choice (item 2)

The random-event title, descriptions, logs, and English equivalent distinguish the temporary energy front from map storm locations. The event receives a technology choice that consumes no new resource and applies the same 50% module-damage reduction used for protected map storms. Existing pilot, shield, and standard options remain available and retain their current outcomes.

## Failure handling

- A missing or unsupported merge effect stays unavailable; no merge state is written.
- An empty artifact roll produces a visible empty result without changing rewards.
- Fatigued crew IDs are still rejected by the start helper even if UI state becomes stale.
- A result modal renders recorded deltas only; a contract with no reputation or experience change shows no invented row.
- If a queued level result corresponds to an already resolved talent choice, it shows the level result and does not reopen a talent selector.

## Verification

- Package A extends the focused status/contract/assignment checks and runs type-check, lint, and `git diff --check`.
- Package B extends expedition checks (`check:expedition-orbital-scan`, `check:expedition-environments`, and `check:expedition-ruins`) plus type-check and lint.
- Package C adds focused Node checks for result snapshots and level queues, then runs type-check and lint.
- Package D extends random-event checks, then runs type-check and lint.
- Each package is reviewed and merged independently only after its focused checks are green.
