# Crew Relation Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the race `relations` data (already used for the reputation ripple effect and shown read-only in `ReputationPanel.tsx`) also affect gameplay through crew: two named crew members from a hostile-race pair occasionally clash (morale hit), and a friendly-race pair occasionally bonds (shared exp, or rarely a new trait).

**Architecture:** A new pure module (`src/game/crew/relationEvents.ts`) finds eligible crew pairs from `RACES[x].relations` and rolls whether an event fires, scaled by `|relation|`. This is wired into the existing per-turn random-event pipeline (`processRandomEvents.ts`) as a second, independent roll that only runs when the turn's main decision-event roll didn't fire — no new `RandomEventType`, no new UI panel, no new state field. It reuses the existing `randomEventCooldown`, `shiftHappiness`, `gainExp`, and the `giveRandomMutation`-style trait-append pattern.

**Tech Stack:** TypeScript, Zustand (game store), Next.js. Tests follow this repo's existing convention: small assert-based smoke scripts under `scripts/check-*.mjs`, run via `node --experimental-strip-types`, wired into `package.json` as a `check:*` script — there is no Jest/Vitest in this project.

## Global Constraints

- Ponytail (lazy/minimal) mode is active for this project: reuse existing patterns (event pipeline, trait-append pattern, `gainExp`) over new abstractions. Do not add a new `RandomEventType`, new state field, or new UI panel for this feature.
- `node --no-warnings --experimental-strip-types` (this repo's test runner for `.mjs` check scripts) does **not** resolve the `@/` path alias for real (non-type-only) imports — confirmed empirically: `import type {...} from "@/game/types"` is erased and works, but `import { RACES } from "@/game/constants/races"` fails with `Cannot find package '@/game'`. Any new module that a `check-*.mjs` script must import directly has to use **relative imports only** for runtime (non-type) values. This is why `src/game/reputation/ripple.ts` (tested by `check-reputation-ripple.mjs`) has zero imports, and why `src/game/reputation/planetSpecializationAccess.ts` (tested by `check-planet-specialization-access.mjs`) imports `../types/reputation` relatively instead of via `@/`. Follow the same convention for the new module in this plan.
- Crew trait `name`/`desc` strings in `src/game/constants/traits.ts` are hardcoded Russian today (not routed through `t()`/locale files) — this is a pre-existing, out-of-scope inconsistency. New trait entries in this plan follow the exact same (hardcoded Russian) convention as their neighbors; do not invent a new i18n path for them.
- `giveRandomMutation` (the closest existing sibling to this plan's `giveRandomBondingTrait`) has no dedicated `check-*.mjs` test — it's only covered by `tsc --noEmit`. Hold the new trait-grant helper to the same bar; do not invent stricter test coverage than its sibling has.

---

## File Structure

- **Create `src/game/crew/relationEvents.ts`** — pure logic: find eligible crew pairs by race relation, roll whether an event fires. Zero side effects, directly unit-testable.
- **Create `scripts/check-crew-relation-events.mjs`** — assert-based smoke test for the module above, mirroring `scripts/check-reputation-ripple.mjs`.
- **Modify `package.json`** — register the new check script.
- **Modify `src/game/types/crew.ts`** — add two new `PositiveTraitId` values for the bonding-trait pool.
- **Modify `src/game/constants/traits.ts`** — add the two new trait definitions (with a rarity sentinel so hire-time trait generation never draws them) and a `BONDING_TRAITS` id list.
- **Modify `src/game/crew/utils.ts`** — add `giveRandomBondingTrait`, mirroring the existing `giveRandomMutation` right above it.
- **Modify `src/game/slices/gameLoop/processors/processRandomEvents.ts`** — the only file that touches game state: restructure the per-turn trigger so a relation-event roll runs whenever the main decision-event roll doesn't fire, and add the effect-application function.
- **Modify `src/lib/locales/ru.json` / `en.json`** — three new `random_events.logs.*` keys for the event's log text.

---

### Task 1: Pure relation-pair/roll logic + smoke test

**Files:**
- Create: `src/game/crew/relationEvents.ts`
- Create: `scripts/check-crew-relation-events.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `interface CrewRelationPair { a: CrewMember; b: CrewMember; relation: number }`
  - `function getCrewRelationPairs(crew: CrewMember[]): CrewRelationPair[]`
  - `type CrewRelationEventType = "conflict" | "bonding"`
  - `interface CrewRelationEvent { type: CrewRelationEventType; a: CrewMember; b: CrewMember; relation: number }`
  - `function rollCrewRelationEvent(crew: CrewMember[], chancePerPoint: number, rng?: () => number): CrewRelationEvent | null`

- [ ] **Step 1: Write the failing test script**

Create `scripts/check-crew-relation-events.mjs`:

```js
import assert from "node:assert/strict";
import {
  getCrewRelationPairs,
  rollCrewRelationEvent,
} from "../src/game/crew/relationEvents.ts";

const human1 = { id: 1, race: "human", health: 100, name: "H1" };
const synthetic1 = { id: 2, race: "synthetic", health: 100, name: "S1" };
const krylorian1 = { id: 3, race: "krylorian", health: 100, name: "K1" };
const humanDead = { id: 4, race: "human", health: 0, name: "H2" };
const syntheticDead = { id: 6, race: "synthetic", health: 0, name: "S2" };
const crystalline1 = { id: 5, race: "crystalline", health: 100, name: "C1" };

// getCrewRelationPairs: skips dead crew, same-race pairs, and zero relations
// (human/krylorian relation is 0 in constants/races.ts)
const pairs = getCrewRelationPairs([human1, synthetic1, krylorian1, humanDead]);
assert.equal(pairs.length, 2);
assert.deepEqual(
  pairs.map((p) => [p.a.id, p.b.id, p.relation]),
  [
    [1, 2, -10], // human -> synthetic
    [2, 3, -15], // synthetic -> krylorian
  ],
);

// rollCrewRelationEvent: negative relation -> conflict, first eligible pair, rng always clears
const conflict = rollCrewRelationEvent([human1, synthetic1], 0.001, () => 0);
assert.equal(conflict?.type, "conflict");
assert.equal(conflict?.a.id, 1);
assert.equal(conflict?.b.id, 2);

// positive relation -> bonding
const bonding = rollCrewRelationEvent([human1, crystalline1], 0.001, () => 0);
assert.equal(bonding?.type, "bonding");

// rng never clears the chance -> no event
assert.equal(rollCrewRelationEvent([human1, synthetic1], 0.001, () => 1), null);

// dead crew member is excluded -> no eligible pair -> no event regardless of rng
assert.equal(
  rollCrewRelationEvent([human1, syntheticDead], 0.001, () => 0),
  null,
);

// chance scales with |relation|: for the -10 human/synthetic pair, chancePerPoint
// 0.001 gives a 0.01 threshold. 0.0095 clears it, 0.02 doesn't.
assert.equal(
  rollCrewRelationEvent([human1, synthetic1], 0.001, () => 0.0095)?.type,
  "conflict",
);
assert.equal(
  rollCrewRelationEvent([human1, synthetic1], 0.001, () => 0.02),
  null,
);

console.log("Crew relation event checks passed");
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --no-warnings --experimental-strip-types scripts/check-crew-relation-events.mjs`
Expected: FAIL — `Cannot find module '.../src/game/crew/relationEvents.ts'` (file doesn't exist yet).

- [ ] **Step 3: Implement `src/game/crew/relationEvents.ts`**

```ts
import { RACES } from "../constants/races";
import type { CrewMember } from "../types/crew";

// Relative imports only (no `@/` alias): this module is loaded directly by
// scripts/check-crew-relation-events.mjs under plain `node --experimental-strip-types`,
// which does not resolve the `@/` path alias for real (non-type-only) imports.

export interface CrewRelationPair {
    a: CrewMember;
    b: CrewMember;
    relation: number;
}

/**
 * All living crew pairs from two different races with a known, nonzero
 * relation. `relations` in constants/races.ts isn't guaranteed to be defined
 * on both sides, so this checks either race's map.
 */
export function getCrewRelationPairs(crew: CrewMember[]): CrewRelationPair[] {
    const living = crew.filter((c) => c.health > 0);
    const pairs: CrewRelationPair[] = [];
    for (let i = 0; i < living.length; i++) {
        for (let j = i + 1; j < living.length; j++) {
            const a = living[i];
            const b = living[j];
            if (a.race === b.race) continue;
            const relation =
                RACES[a.race]?.relations?.[b.race] ??
                RACES[b.race]?.relations?.[a.race];
            if (typeof relation !== "number" || relation === 0) continue;
            pairs.push({ a, b, relation });
        }
    }
    return pairs;
}

export type CrewRelationEventType = "conflict" | "bonding";

export interface CrewRelationEvent {
    type: CrewRelationEventType;
    a: CrewMember;
    b: CrewMember;
    relation: number;
}

/**
 * Rolls whether a relation-driven crew event fires this turn. Each eligible
 * pair gets an independent roll (first hit wins); chance scales with
 * |relation| so strongly hostile/friendly pairs surface more often.
 */
export function rollCrewRelationEvent(
    crew: CrewMember[],
    chancePerPoint: number,
    rng: () => number = Math.random,
): CrewRelationEvent | null {
    for (const pair of getCrewRelationPairs(crew)) {
        const chance = Math.abs(pair.relation) * chancePerPoint;
        if (rng() < chance) {
            return {
                type: pair.relation < 0 ? "conflict" : "bonding",
                a: pair.a,
                b: pair.b,
                relation: pair.relation,
            };
        }
    }
    return null;
}
```

- [ ] **Step 4: Run it again to confirm it passes**

Run: `node --no-warnings --experimental-strip-types scripts/check-crew-relation-events.mjs`
Expected: PASS — prints `Crew relation event checks passed`.

- [ ] **Step 5: Register the npm script**

In `package.json`, add a line right after the existing `"check:reputation"` entry (currently `"check:reputation": "node --no-warnings --experimental-strip-types scripts/check-reputation-ripple.mjs",`):

```json
    "check:crew-relation-events": "node --no-warnings --experimental-strip-types scripts/check-crew-relation-events.mjs",
```

Run: `npm run check:crew-relation-events`
Expected: PASS — same output as Step 4.

- [ ] **Step 6: Commit**

```bash
git add src/game/crew/relationEvents.ts scripts/check-crew-relation-events.mjs package.json
git commit -m "feat: add relation-driven crew event pair/roll logic"
```

---

### Task 2: Bonding trait pool + grant helper

**Files:**
- Modify: `src/game/types/crew.ts`
- Modify: `src/game/constants/traits.ts`
- Modify: `src/game/crew/utils.ts`

**Interfaces:**
- Consumes: none (independent of Task 1).
- Produces: `giveRandomBondingTrait(crewMember: CrewMember, set: (fn: (s: { crew: CrewMember[] }) => Partial<{ crew: CrewMember[] }>) => void): string | null` — same shape as the existing `giveRandomMutation`. Returns the granted trait's `name`, or `null` if the recipient already has every bonding trait.

- [ ] **Step 1: Add the two new trait ids to `PositiveTraitId`**

In `src/game/types/crew.ts`, extend the union (currently ends with `| "trader";` at line 29):

```ts
export type PositiveTraitId =
    | "sharpshooter"
    | "experienced"
    | "charismatic"
    | "resilient"
    | "hardworking"
    | "veteran"
    | "genius"
    | "leader"
    | "lucky"
    | "invincible"
    | "legend"
    | "master"
    | "trader"
    | "bonded"
    | "mentor";
```

- [ ] **Step 2: Add `BONDING_TRAITS` and the two trait definitions in `src/game/constants/traits.ts`**

Add the id list near the top, right after `MUTATION_TRAITS` (which ends at line 12 with `];`):

```ts
export const BONDING_TRAITS: PositiveTraitId[] = ["bonded", "mentor"];
```

This needs `PositiveTraitId` imported — update the top import (currently `import type { CrewTraitType, MutationTraitId, TraitDetails } from "../types";`) to:

```ts
import type { CrewTraitType, MutationTraitId, PositiveTraitId, TraitDetails } from "../types";
```

Then append the two entries at the end of the `positive` array in `CREW_TRAITS`. The array currently ends like this (lines 121–130):

```ts
        {
            id: "master",
            name: "Мастер",
            desc: "Двойной эффект от заданий",
            effect: { doubleTaskEffect: 1 },
            rarity: "legendary",
            priceMod: 2.8,
        },
    ],
    negative: [
```

Insert the two new entries right after the `master` entry's closing `},` and before the array's closing `],`:

```ts
        // Bonding traits — only granted by the crew_relation_bonding event
        // (rarity: "bonding" is a sentinel that never matches the "common"/
        // "rare"/"legendary" checks in generateCrewTraits, so these can't be
        // rolled at hire time)
        {
            id: "bonded",
            name: "Крепкая дружба",
            desc: "+8 настроение команды в модуле (сдружился с представителем другой расы)",
            effect: { moduleMorale: 8 },
            rarity: "bonding",
            priceMod: 1,
        },
        {
            id: "mentor",
            name: "Межкультурный наставник",
            desc: "+10% к опыту (перенял знания коллеги другой расы)",
            effect: { expBonus: 0.1 },
            rarity: "bonding",
            priceMod: 1,
        },
```

- [ ] **Step 3: Run the type check**

Run: `npm run type-check`
Expected: PASS (no errors). This confirms the new trait ids and `CREW_TRAITS.positive` entries type-check, and that `TRAIT_REGISTRY` in `crew/utils.ts` (built from `CREW_TRAITS.positive`) now includes `bonded`/`mentor` — `getTraitById("bonded")` and `getTraitById("mentor")` will resolve.

- [ ] **Step 4: Add `giveRandomBondingTrait` in `src/game/crew/utils.ts`**

Insert right after `giveRandomMutation` ends (it ends at line 324 with `};`, immediately followed by the `getBestByProfession` doc comment at line 326):

```ts
/**
 * Даёт члену экипажа случайный ещё не полученный бондинг-трейт (см.
 * BONDING_TRAITS) — вызывается только из crew_relation_bonding события.
 * Возвращает название трейта или null, если получать больше нечего.
 */
export const giveRandomBondingTrait = (
    crewMember: CrewMember,
    set: (
        fn: (s: { crew: CrewMember[] }) => Partial<{ crew: CrewMember[] }>,
    ) => void,
): string | null => {
    const existingIds = new Set(crewMember.traits.map((t) => t.id));
    const available = BONDING_TRAITS.filter((id) => !existingIds.has(id));
    if (available.length === 0) return null;
    const newTraitId = available[Math.floor(Math.random() * available.length)];
    const newTrait = getTraitById(newTraitId);
    set((s) => ({
        crew: s.crew.map((c) =>
            c.id === crewMember.id
                ? { ...c, traits: [...c.traits, newTrait] }
                : c,
        ),
    }));
    return newTrait.name;
};
```

This needs `BONDING_TRAITS` imported — update the top `@/game/constants` import (currently `import { CREW_TRAITS, DEFAULT_MAX_HEALTH, MUTATION_TRAITS, MUTATION_CHANCES, RACE_LAST_NAMES, RACES } from "@/game/constants";`) to also include it:

```ts
import {
    CREW_TRAITS,
    DEFAULT_MAX_HEALTH,
    MUTATION_TRAITS,
    MUTATION_CHANCES,
    RACE_LAST_NAMES,
    RACES,
    BONDING_TRAITS,
} from "@/game/constants";
```

- [ ] **Step 5: Run the type check again**

Run: `npm run type-check`
Expected: PASS.

(No new `check-*.mjs` assertions here: `crew/utils.ts` imports `@/game/store` at the top, a real value import that plain `node --experimental-strip-types` can't resolve — the same reason `giveRandomMutation`, its sibling, has no standalone test either. `tsc --noEmit` is the bar this class of helper is held to in this repo.)

- [ ] **Step 6: Commit**

```bash
git add src/game/types/crew.ts src/game/constants/traits.ts src/game/crew/utils.ts
git commit -m "feat: add bonding trait pool and grant helper"
```

---

### Task 3: Wire into the per-turn random-event pipeline

**Files:**
- Modify: `src/game/slices/gameLoop/processors/processRandomEvents.ts`
- Modify: `src/lib/locales/ru.json`
- Modify: `src/lib/locales/en.json`

**Interfaces:**
- Consumes: `rollCrewRelationEvent`, `CrewRelationEvent` (Task 1); `giveRandomBondingTrait` (Task 2); existing `shiftHappiness`, `SetState`, `GameStore`, `i18nStore.t`, `playSound`.
- Produces: nothing further downstream — this is the top of the call chain (invoked each turn by `gameLoopSlice.ts`, already wired).

- [ ] **Step 1: Add the new locale keys**

In `src/lib/locales/ru.json`, right after the `"crew_dispute_standard"` line (currently line 4334: `"crew_dispute_standard": "Конфликт прекращён приказом: мораль экипажа -{{penalty}}",`), insert:

```json
            "crew_relation_conflict": "{{nameA}} и {{nameB}} не поладили из-за расовой неприязни: мораль обоих упала на {{penalty}}",
            "crew_relation_bonding": "{{nameA}} и {{nameB}} нашли общий язык и обменялись опытом: +{{exp}} опыта обоим",
            "crew_relation_trait": "{{nameA}} и {{nameB}} сдружились — {{recipient}} перенял(а) новую черту: {{trait}}",
```

In `src/lib/locales/en.json`, right after the equivalent `"crew_dispute_standard"` line (line 4334: `"crew_dispute_standard": "Dispute ended by command: crew morale -{{penalty}}",`), insert:

```json
            "crew_relation_conflict": "{{nameA}} and {{nameB}} clashed over racial tension: morale down {{penalty}} for both",
            "crew_relation_bonding": "{{nameA}} and {{nameB}} bonded and traded know-how: +{{exp}} exp for both",
            "crew_relation_trait": "{{nameA}} and {{nameB}} grew close — {{recipient}} picked up a new trait: {{trait}}",
```

- [ ] **Step 2: Run the locale consistency check**

Run: `npm run check:data`
Expected: PASS — `Data consistency checks passed (6 races, <N+3> locale keys)` (key count goes up by 3 vs. before this step).

- [ ] **Step 3: Update imports and add tuning constants in `processRandomEvents.ts`**

Change the import on line 18 from:

```ts
import { shiftHappiness } from "@/game/crew";
```

to:

```ts
import { shiftHappiness, giveRandomBondingTrait } from "@/game/crew";
import { rollCrewRelationEvent } from "@/game/crew/relationEvents";
import type { CrewRelationEvent } from "@/game/crew/relationEvents";
```

Add these constants right after line 23 (`const FIRST_EVENT_TURN = 6;`), before the `// ─── Payload ranges ───` comment:

```ts
// ─── Crew relation event tuning ───────────────────────────────
const CREW_RELATION_CHANCE_PER_POINT = 0.001; // |relation| 20 -> ~2% chance per eligible pair per turn
const CREW_RELATION_COOLDOWN = 6;
const RELATION_EVENT_HAPPINESS = 6;
const RELATION_EVENT_EXP = 3;
const RELATION_TRAIT_CHANCE = 0.25;
```

- [ ] **Step 4: Add `applyCrewRelationEvent`**

Insert this function right after `applyCrewDisputeChoice` ends (line 477, `}`) and before `applyBiohazardChoice` starts (line 479):

```ts
function applyCrewRelationEvent(
  event: CrewRelationEvent,
  set: SetState,
  get: () => GameStore,
): void {
  set({ randomEventCooldown: CREW_RELATION_COOLDOWN });

  if (event.type === "conflict") {
    set((state) => ({
      crew: state.crew.map((member) =>
        member.id === event.a.id || member.id === event.b.id
          ? shiftHappiness(member, -RELATION_EVENT_HAPPINESS)
          : member,
      ),
    }));
    get().addLog(
      i18nStore.t("random_events.logs.crew_relation_conflict", {
        nameA: event.a.name,
        nameB: event.b.name,
        penalty: RELATION_EVENT_HAPPINESS,
      }),
      "warning",
    );
    playSound("ui_notification");
    return;
  }

  if (Math.random() < RELATION_TRAIT_CHANCE) {
    const recipient = Math.random() < 0.5 ? event.a : event.b;
    const traitName = giveRandomBondingTrait(recipient, set);
    if (traitName) {
      get().addLog(
        i18nStore.t("random_events.logs.crew_relation_trait", {
          nameA: event.a.name,
          nameB: event.b.name,
          recipient: recipient.name,
          trait: traitName,
        }),
        "info",
      );
      playSound("ui_notification");
      return;
    }
  }

  set((state) => ({
    crew: state.crew.map((member) =>
      member.id === event.a.id || member.id === event.b.id
        ? shiftHappiness(member, RELATION_EVENT_HAPPINESS)
        : member,
    ),
  }));
  get().gainExp(
    get().crew.find((c) => c.id === event.a.id),
    RELATION_EVENT_EXP,
  );
  get().gainExp(
    get().crew.find((c) => c.id === event.b.id),
    RELATION_EVENT_EXP,
  );
  get().addLog(
    i18nStore.t("random_events.logs.crew_relation_bonding", {
      nameA: event.a.name,
      nameB: event.b.name,
      exp: RELATION_EVENT_EXP,
    }),
    "info",
  );
  playSound("ui_notification");
}
```

- [ ] **Step 5: Restructure the trigger tail of `processRandomEvents`**

Replace the whole `// Phase B: maybe spawn a fresh event` block through the end of the function (currently lines 984–1006):

```ts
  // Phase B: maybe spawn a fresh event
  if (
    state.currentCombat ||
    state.pendingTravelEvent ||
    state.pendingRandomEvent ||
    state.scheduledRandomEventConsequence ||
    state.turn < FIRST_EVENT_TURN ||
    state.randomEventCooldown > 0 ||
    Math.random() >= EVENT_TRIGGER_CHANCE
  ) {
    return;
  }

  const eventType = pickRandomEvent(state);
  const event = generateEventPayload(eventType, state);

  set({ pendingRandomEvent: event, randomEventCooldown: EVENT_COOLDOWN });
  get().addLog(
    i18nStore.t(`random_events.logs.detected_${event.type}`),
    "warning",
  );
  playSound("ui_notification");
};
```

with:

```ts
  // Phase B: maybe spawn a fresh decision event, or a relation-driven crew tick
  const busy =
    state.currentCombat ||
    state.pendingTravelEvent ||
    state.pendingRandomEvent ||
    state.scheduledRandomEventConsequence ||
    state.turn < FIRST_EVENT_TURN ||
    state.randomEventCooldown > 0;

  if (busy) return;

  if (Math.random() < EVENT_TRIGGER_CHANCE) {
    const eventType = pickRandomEvent(state);
    const event = generateEventPayload(eventType, state);

    set({ pendingRandomEvent: event, randomEventCooldown: EVENT_COOLDOWN });
    get().addLog(
      i18nStore.t(`random_events.logs.detected_${event.type}`),
      "warning",
    );
    playSound("ui_notification");
    return;
  }

  const relationEvent = rollCrewRelationEvent(
    state.crew,
    CREW_RELATION_CHANCE_PER_POINT,
  );
  if (relationEvent) {
    applyCrewRelationEvent(relationEvent, set, get);
  }
};
```

- [ ] **Step 6: Run the full check suite**

Run:
```bash
npm run type-check
npm run lint
npm run check:crew-relation-events
npm run check:data
```
Expected: all four PASS.

- [ ] **Step 7: Manual smoke check (optional but recommended)**

This event is probabilistic and can't be triggered on demand through the UI. To sanity-check it end-to-end without waiting on RNG, temporarily bump `CREW_RELATION_CHANCE_PER_POINT` to something like `0.5` in a local run, start a new game with crew from two races with a nonzero relation (e.g. hire one `synthetic` alongside the default `human` captain), advance a few turns past turn 6, and confirm a `crew_relation_conflict`/`crew_relation_bonding` log line appears with real crew names. Revert the constant back to `0.001` afterward — do not commit the temporary value.

- [ ] **Step 8: Commit**

```bash
git add src/game/slices/gameLoop/processors/processRandomEvents.ts src/lib/locales/ru.json src/lib/locales/en.json
git commit -m "feat: fire relation-driven crew conflict/bonding events each turn"
```

---

## Self-Review Notes

- **Spec coverage:** `crew_conflict` (named-pair happiness penalty) → Task 3 conflict branch. `crew_bonding` exp-for-both → Task 3 bonding branch. Rare bonding trait grant → Task 2 + Task 3 trait branch. Named crew members in log text → `nameA`/`nameB`/`recipient` params throughout. New locale strings → Task 3 Step 1. Probability tuning/anti-spam → shared `randomEventCooldown` reuse + `CREW_RELATION_CHANCE_PER_POINT`/`CREW_RELATION_COOLDOWN` constants, both easy to retune in one place. `check:*` smoke test convention → Task 1. Contracts-based alternative → explicitly out of scope, not touched.
- **Placeholder scan:** none — every step has literal code, exact file paths, and exact surrounding lines to anchor edits.
- **Type consistency:** `CrewRelationEvent`/`CrewRelationPair`/`CrewRelationEventType` defined once in Task 1 and consumed as-is (same names) in Task 3. `giveRandomBondingTrait`'s signature in Task 2 matches its Task 3 call site exactly (`(crewMember, set) => string | null`). `rollCrewRelationEvent(crew, chancePerPoint, rng?)` signature matches both the Task 1 test calls and the Task 3 call site (two-arg call relies on the `rng` default).
