# Компактная карта и точные последствия фракционной доставки Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать верхний оверлей карты компактнее, показывать для поставок только точку сдачи и привести фактические последствия фракционной доставки к заявленным `+4/−4`.

**Architecture:** Слой отображения меняется локально в `SectorMap` и `ContractsList`. Для репутации расширяется существующая публичная команда `changeReputation`: дополнительный параметр исключает перечисленные расы только из вторичной дипломатической ряби, сохраняя неизменными все обычные вызовы. Резолвер фракционной доставки передаёт в неё вторую сторону выбора, поэтому прямые изменения не взаимно компенсируются.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Zustand + Immer, Tailwind CSS, Node assert-based check scripts.

## Global Constraints

- Не добавлять зависимостей, компонентов, типов контрактов или новых механик дипломатии.
- На экранах меньше `lg` оверлей карты остаётся вертикальным.
- Для локального выбора прямой итог всегда `+4` местной расе и `−4` заказчику; рябь остаётся только у третьих рас.
- Сохранять RU/EN локализацию и проверять отсутствие сырых плейсхолдеров.
- Использовать `apply_patch` для всех файловых изменений; после каждой задачи выполнять её узкую проверку.

---

### Task 1: Точные последствия и текст фракционной доставки

**Files:**
- Modify: `src/game/types/game.ts:447-456`
- Modify: `src/game/slices/reputation/createReputationSlice.ts:19-74`
- Modify: `src/game/slices/contracts/helpers/completeDeliveryContract.ts:68-73`
- Modify: `src/game/components/FactionDeliveryDecisionModal.tsx:64-67`
- Modify: `scripts/check-faction-delivery-choices.mjs:190-245, 390-410`
- Modify: `docs/CAMPAIGN_PROGRESSION.md`
- Modify: `docs/REPUTATION_TRADEOFFS.md`

**Interfaces:**
- Consumes: `GameReputation.changeReputation(raceId, amount)` and `calculateReputationRippleEffects` through the existing reputation slice.
- Produces: `GameReputation.changeReputation(raceId, amount, options?)`, where `options` is `{ excludeRippleRaceIds?: readonly RaceId[] }`.
- Consumed later: `resolveFactionDeliveryDecision` calls the action twice with the other direct party excluded from ripple.

- [x] **Step 1: Write failing choice-regression checks**

  In `scripts/check-faction-delivery-choices.mjs`, add a fixture for a local human / issuer crystalline delivery that composes the real `createReputationSlice` with `createContractsSlice`. Assert these exact final values after `resolveFactionDeliveryDecision("local")`:

  ```js
  assert.equal(state.raceReputation.human, 4);
  assert.equal(state.raceReputation.crystalline, -4);
  assert.equal(
    state.raceReputation.xenosymbiont,
    -1,
    "third races must retain the issuer's normal diplomatic ripple",
  );
  ```

  Import a pure formatter from the modal and assert its real RU output:

  ```js
  assert.equal(
    getFactionDeliveryContextText(
      i18nStore.t.bind(i18nStore),
      "diplomatic_claim",
      "Дипломатический груз",
      "Кристаллоиды",
    ),
    "Местные власти оспаривают право Кристаллоиды распоряжаться этим грузом.",
  );
  ```

- [x] **Step 2: Run the focused check and confirm RED**

  Run: `npm run check:faction-delivery-choices`

  Expected: failure because the current two sequential reputation changes reduce people and crystalloids to `+3` and `−3`, and the pure context formatter is not exported yet.

- [x] **Step 3: Implement the minimal ripple exclusion**

  In `src/game/types/game.ts`, define the option before `GameReputation` and make it optional:

  ```ts
  export interface ReputationChangeOptions {
    excludeRippleRaceIds?: readonly RaceId[];
  }

  changeReputation: (
    raceId: RaceId,
    amount: number,
    options?: ReputationChangeOptions,
  ) => void;
  ```

  In `createReputationSlice`, filter `result.affectedRaces` once before both the state update and logs:

  ```ts
  const excludedRaceIds = new Set(options?.excludeRippleRaceIds);
  const affectedRaces = result.affectedRaces.filter(
    ({ raceId: affectedRaceId }) => !excludedRaceIds.has(affectedRaceId),
  );
  ```

  Keep direct primary state changes, level logging and all existing call sites unchanged. In `completeDeliveryContract.ts`, call:

  ```ts
  get().changeReputation(contract.sourceDominantRace, -4, {
    excludeRippleRaceIds: [contract.factionDelivery.localRace],
  });
  get().changeReputation(contract.factionDelivery.localRace, 4, {
    excludeRippleRaceIds: [contract.sourceDominantRace],
  });
  ```

  Export `getFactionDeliveryContextText(t, context, cargoName, sourceRaceName)` from the modal, have the modal render its return value, and pass both `cargo` and `sourceRace` to the translation. Update the two campaign/reputation documents to say that direct parties stay exact and ripple reaches only third races.

- [x] **Step 4: Run the focused check and confirm GREEN**

  Run: `npm run check:faction-delivery-choices`

  Expected: `faction delivery choice checks passed` with the human/crystalline direct values exactly `+4` and `−4` and the third-race ripple assertion passing.

- [x] **Step 5: Commit Task 1**

  ```bash
  git add src/game/types/game.ts src/game/slices/reputation/createReputationSlice.ts src/game/slices/contracts/helpers/completeDeliveryContract.ts src/game/components/FactionDeliveryDecisionModal.tsx scripts/check-faction-delivery-choices.mjs docs/CAMPAIGN_PROGRESSION.md docs/REPUTATION_TRADEOFFS.md
  git commit -m "fix: keep faction delivery reputation outcomes exact"
  ```

### Task 2: Точка сдачи в поставке ресурсов

**Files:**
- Modify: `src/game/components/ContractsList.tsx:30-60, 509-550`
- Modify: `scripts/check-contract-labels.mjs:10-20, 292-310`

**Interfaces:**
- Consumes: `Contract.sourceName`, `sourceSectorName`, `sourceType`, `getLocationName`, and existing `contracts.task_where` / `events.*` translation keys.
- Produces: `getSupplyRunTurnInLocation(contract, t)` and the `supply_run` details row `Где сдать`, containing only the named receiving location.
- Consumed later: no new interface; contract detail modal renders the returned task values unchanged.

- [x] **Step 1: Write a failing turn-in formatter regression**

  Import `getSupplyRunTurnInLocation` alongside `ContractsList` in `scripts/check-contract-labels.mjs`, then add an observable location assertion:

  ```js
  const supplyTurnIn = getSupplyRunTurnInLocation(
    {
      sourceName: "Таласса",
      sourceSectorName: "Гелиос-1",
      sourceType: "planet",
    },
    i18nStore.t.bind(i18nStore),
  );
  assert.equal(
    supplyTurnIn,
    'Планета "Таласса" (Гелиос-1)',
    "where-to-turn-in must name only the receiving location",
  );
  assert.doesNotMatch(
    supplyTurnIn,
    /Купить|найти в другом месте/,
    "where-to-turn-in must not repeat the goods-acquisition hint",
  );
  ```

- [x] **Step 2: Run the focused check and confirm RED**

  Run: `npm run check:contract-labels`

  Expected: failure because `getSupplyRunTurnInLocation` is not exported yet.

- [x] **Step 3: Replace the mixed value with only the receiving location**

  Export this pure formatter near `TFunction` in `ContractsList.tsx`:

  ```ts
  export function getSupplyRunTurnInLocation(
    contract: Pick<Contract, "sourceName" | "sourceSectorName" | "sourceType">,
    t: TFunction,
  ): string {
    if (!contract.sourceName || !contract.sourceSectorName) {
      return getLocationName(contract.sourceSectorName ?? t("contracts.unknown"), t);
    }
    const type = contract.sourceType === "planet"
      ? t("events.planet")
      : t("events.friendly_ship");
    return `${type} "${getLocationName(contract.sourceName, t)}" (${getLocationName(contract.sourceSectorName, t)})`;
  }
  ```

  Use it as the `task_where` value in `supply_run`. Do not add a second purchase hint or a new translation key.

- [x] **Step 4: Run the focused check and confirm GREEN**

  Run: `npm run check:contract-labels`

  Expected: `Contract label checks passed`.

- [x] **Step 5: Commit Task 2**

  ```bash
  git add src/game/components/ContractsList.tsx scripts/check-contract-labels.mjs
  git commit -m "fix: show only supply turn-in destination"
  ```

### Task 3: Компактный desktop-оверлей карты сектора

**Files:**
- Modify: `src/game/components/SectorMap.tsx:1337-1368`
- Modify: `scripts/check-sector-rules.mjs:1-100`

**Interfaces:**
- Consumes: existing `currentSectorRule`, rule name/description translations and scanner overlay.
- Produces: the same sector-rule content in a responsive `lg` horizontal row and a narrow-screen vertical stack.
- Consumed later: none; the canvas and scanner indicators retain their existing state and event handling.

- [x] **Step 1: Write a failing layout regression**

  In `scripts/check-sector-rules.mjs`, register the UI loader, render the real `SectorMap` with a `trade_lane` sector, then assert the emitted overlay markup:

  ```js
  const { setUiState } = await import("./register-ui-loader.mjs");
  setUiState({
    currentSector: { id: 1, name: "Астерион-1", ruleId: "trade_lane", locations: [] },
    selectLocation: () => {}, travelThroughBlackHole: () => {}, completedLocations: [],
    getEffectiveScanRange: () => 0, canScanObject: () => false,
    syncNavigatorIntel: () => {}, navigatorTargets: [], knownLocationIntel: {}, outposts: [],
    crew: [], settings: { animationsEnabled: false }, sectorZoom: 1,
    sectorOffset: { x: 0, y: 0 }, setSectorZoom: () => {}, setSectorOffset: () => {},
  });
  const { SectorMap } = await import("../src/game/components/SectorMap.tsx");
  const sectorMapMarkup = renderToStaticMarkup(createElement(SectorMap));
  assert.match(
    sectorMapMarkup,
    /flex min-w-0 flex-col gap-1 lg:flex-row/,
    "desktop sector overlay must put the system feature beside the sector name",
  );
  ```

- [x] **Step 2: Run the focused check and confirm RED**

  Run: `npm run check:sector-rules`

  Expected: failure at `desktop sector overlay must put the system feature beside the sector name`, because the current class is vertical at every breakpoint.

- [x] **Step 3: Make the existing cards responsive**

  Change only the existing wrapper classes in `SectorMap.tsx`:

  ```tsx
  <div className="flex min-w-0 flex-col gap-1 lg:flex-row lg:items-start">
  ```

  Keep both child cards, their copy, colors, pointer-event behavior and scanner sibling intact. Add `lg:shrink-0` to the sector-name card if its width otherwise stretches the entire row.

- [x] **Step 4: Run the focused check and confirm GREEN**

  Run: `npm run check:sector-rules`

  Expected: `Sector rule contract checks passed`.

- [x] **Step 5: Run the complete affected suite**

  Run:

  ```bash
  npm run check:faction-delivery-choices && npm run check:contract-labels && npm run check:sector-rules && npm run check:reputation && npm run check:log-placeholders && npm run type-check && npm run lint && npm run build && git diff --check
  ```

  Expected: every command exits `0`; the build completes TypeScript checking without `ignoreBuildErrors`.

- [x] **Step 6: Commit Task 3**

  ```bash
  git add src/game/components/SectorMap.tsx scripts/check-sector-rules.mjs
  git commit -m "refactor: compact sector rule overlay on desktop"
  ```
