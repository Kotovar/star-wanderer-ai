# Combat-round crew safety design

## Goal

Make each completed combat round a real crew turn: a crew member may move again on the next player action, and crew in a critically damaged module take the existing environmental damage each round.

## Scope

This covers observations 11 and 12 only. It does not advance the strategic-map turn, alter combat damage formulas, add new UI, or change direct-hit crew damage.

## Current cause

`initNewTurn()` is the only place that clears `crew.movedThisTurn`, but combat uses `advanceCombatRound()` instead. `checkModuleDamage()` is likewise called only by `nextTurn()`, so its critical-module damage is absent during combat.

## Chosen design

Extend `advanceCombatRound()` in `src/game/slices/combat/helpers/combatTime.ts`.

For every completed combat round (attack, skipped turn, or failed retreat), it will run in this order:

1. Increment `currentCombat.round`.
2. Call the existing `checkModuleDamage(get, set)` helper. It retains the established thresholds, damage values, logs, first-aid rules, death handling, and artifact protections.
3. Call the existing `processCrewAssignments(set, get)`. Passive regeneration and combat repair/heal actions therefore occur after the module hazard, matching the ordinary map-turn ordering.
4. Clear `movedThisTurn` for living current crew so the next player action may include one adjacent move per crew member.
5. Keep the existing stat refresh, game-over check, and save.

`turn`, random-event cooldowns, contracts, travel, map events, and module-movement flags remain untouched. The existing `CrewMemberCard` already renders `movedThisTurn`, so it needs no UI change.

## Verification

Add one focused script under `scripts/` that constructs a combat state and asserts both invariants after `advanceCombatRound()`:

- a crew member marked `movedThisTurn: true` is eligible to move in the next combat round;
- a crew member in a critical module loses the established module-hazard HP before any regenerative effect can restore HP.

Run that script with the project TypeScript runner, then `npm run type-check`, `npm run lint`, and `git diff --check`.
