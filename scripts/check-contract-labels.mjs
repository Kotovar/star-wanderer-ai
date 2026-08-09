import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setUiState, patchUiState } from "./register-ui-loader.mjs";

/**
 * Рендерит списки заданий и убеждается, что ни один тип контракта не протекает
 * в интерфейс сырым ключом перевода или неподставленным плейсхолдером.
 * Именно так ломались crisis_response и fabrication: `contracts.desc_fabrication`
 * в заголовке и `{{weapon}}` в тексте предложения.
 */

const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { ContractsList } = await import(
  "../src/game/components/ContractsList.tsx"
);
const { PlanetPanel } = await import(
  "../src/game/components/PlanetPanel.tsx"
);

const FABRICATION = {
  id: "c-fab",
  type: "fabrication",
  desc: "contracts.desc_fabrication",
  reward: 900,
  requiredWeaponType: "drones",
  sourcePlanetId: "p1",
  sourcePlanetName: "Церера-3",
  sourceSectorName: "Меридиан-1",
  sourceDominantRace: "human",
};

const CRISIS_RESPONSE = {
  id: "c-crisis",
  type: "crisis_response",
  desc: "contracts.desc_crisis_response",
  reward: 1200,
  cargo: "medicine",
  quantity: 16,
  crisisId: "epidemic",
  crisisName: "crises.epidemic.name",
  sourcePlanetId: "p1",
  sourcePlanetName: "Церера-3",
  sourceSectorName: "Меридиан-1",
  sourceDominantRace: "human",
};

const SYNTHETIC_RESEARCH = {
  id: "c-synthetic-research",
  type: "research",
  desc: "contracts.desc_research_synth",
  reward: 700,
  requiresTechResearch: true,
  requiredTechTier: 2,
  requiredRace: "synthetic",
  isRaceQuest: true,
  timeLimit: 15,
};

setUiState({
  activeContracts: [FABRICATION, CRISIS_RESPONSE],
  completedContractIds: [],
  cancelContract: () => {},
  turn: 5,
  addLog: () => {},
  ship: { cargo: [], tradeGoods: [] },
  raceReputation: {},
  artifacts: [],
  research: { researchedTechs: [], unlockedRecipes: ["drones"] },
  galaxy: { sectors: [] },
  activeCrisis: { id: "epidemic", turnsRemaining: 20 },
  completedLocations: [],
});

const markup = renderToStaticMarkup(createElement(ContractsList));

// ── Ни сырых ключей, ни неподставленных плейсхолдеров ───────────────────────
assert.doesNotMatch(
  markup,
  /contracts\.(desc|name|type)_/,
  "сырой ключ перевода протёк в список заданий",
);
assert.doesNotMatch(
  markup,
  /\{\{\w+\}\}/,
  "неподставленный плейсхолдер протёк в список заданий",
);
assert.doesNotMatch(markup, /crises\.\w+\.name/, "имя кризиса не переведено");

// ── Оба типа реально отрисовались под своими именами ────────────────────────
assert.ok(
  markup.includes("Боевые дроны"),
  "заказ на изготовление обязан называть нужное орудие",
);
assert.ok(
  markup.includes("Медикаменты"),
  "отклик на кризис обязан называть нужный груз",
);

// ── И то же самое на английском: имена не должны застревать по-русски ───────
const { store: i18nStore } = await import("../src/lib/useTranslation.ts");
i18nStore.changeLanguage("en");
// Английский каталог грузится отдельным чанком — дождёмся его
await new Promise((done) => setTimeout(done, 0));
assert.equal(
  i18nStore.t("weapon_types.drones"),
  "Combat Drones",
  "английский каталог не загрузился — проверка была бы бессмысленной",
);
const englishMarkup = renderToStaticMarkup(createElement(ContractsList));
assert.doesNotMatch(
  englishMarkup,
  /[А-Яа-яЁё]/,
  "русские названия протекли в английский интерфейс",
);
assert.ok(
  englishMarkup.includes("Combat Drones"),
  "оружие обязано называться по-английски",
);
assert.ok(
  englishMarkup.includes("Medicine"),
  "груз помощи обязан называться по-английски",
);
i18nStore.changeLanguage("ru");

// ── Прогресс виден: в списке он рисуется полосой, ширина = доля выполнения ──
const bars = (html) => [...html.matchAll(/width:\s*([\d.]+)%/g)].map((m) => m[1]);
assert.deepEqual(
  bars(markup),
  ["0", "0"],
  "пустой трюм обязан давать нулевой прогресс обоим заданиям",
);

// ── С готовым предметом в трюме прогресс закрывается, появляется метка ──────
patchUiState({
  ship: {
    cargo: [
      {
        item: "crafted_weapon_drones",
        quantity: 1,
        isCraftedWeapon: true,
        weaponType: "drones",
      },
    ],
    tradeGoods: [{ item: "medicine", quantity: 16 }],
  },
});
const readyMarkup = renderToStaticMarkup(createElement(ContractsList));
assert.deepEqual(
  bars(readyMarkup),
  ["100", "100"],
  "собранное орудие и гружёные медикаменты обязаны закрывать прогресс",
);
assert.equal(
  (readyMarkup.match(/contracts\.ready_badge|ГОТОВО|READY/gi) ?? []).length > 0,
  true,
  "готовое задание обязано получать метку готовности",
);

// ── Экраны крафта: тот же объект не должен называться по-разному ────────────
const { BlueprintsTab } = await import(
  "../src/game/components/BlueprintsTab.tsx"
);
patchUiState({
  research: {
    researchedTechs: [],
    unlockedRecipes: [
      "plasma",
      "drones",
      "antimatter",
      "quantum_torpedo",
      "ion_cannon",
    ],
  },
  moduleRecipes: [
    "bio_research_lab",
    "pulse_drive",
    "habitat_module",
    "deep_survey_array",
  ],
});
i18nStore.changeLanguage("en");
const blueprintsMarkup = renderToStaticMarkup(createElement(BlueprintsTab));
assert.doesNotMatch(
  blueprintsMarkup,
  /[А-Яа-яЁё]/,
  "русские названия рецептов протекли в английский интерфейс чертежей",
);
assert.ok(
  blueprintsMarkup.includes("Ion Cannon"),
  "рецепт оружия обязан называться так же, как в заказе на изготовление",
);
assert.ok(
  blueprintsMarkup.includes("Deep Survey Array"),
  "рецепт гибридного модуля тоже обязан переводиться",
);
i18nStore.changeLanguage("ru");
const blueprintsRu = renderToStaticMarkup(createElement(BlueprintsTab));
assert.ok(
  blueprintsRu.includes("Ионная пушка"),
  "русский каталог обязан продолжать работать",
);

// ── Все типы контрактов имеют человеческое имя, а не ключ ───────────────────
const contractTypesSource = readFileSync(
  new URL("../src/game/types/contracts.ts", import.meta.url),
  "utf8",
);
const declaredTypes = contractTypesSource
  .slice(contractTypesSource.indexOf("export type ContractType"))
  .split(";")[0]
  .match(/"([a-z_]+)"/g)
  .map((quoted) => quoted.replaceAll('"', ""));
const listSource = readFileSync(
  new URL("../src/game/components/ContractsList.tsx", import.meta.url),
  "utf8",
);
const statusSwitch = listSource.slice(
  listSource.indexOf("const getStatusText"),
  listSource.indexOf("const getContractDetails"),
);
for (const type of declaredTypes) {
  assert.ok(
    statusSwitch.includes(`case "${type}"`),
    `${type} не назван в getStatusText — в списке заданий покажется сырой ключ`,
  );
}

setUiState({
  currentLocation: {
    id: "synthetic-planet",
    type: "planet",
    name: "Синтетическая планета",
    planetType: "Ледяная",
    dominantRace: "synthetic",
    contracts: [SYNTHETIC_RESEARCH],
  },
  credits: 0,
  activeContracts: [],
  completedContractIds: [],
  raceReputation: { synthetic: 0 },
  galaxy: { sectors: [] },
  completedLocations: [],
  artifacts: [],
  research: { researchedTechs: [], unlockedRecipes: [] },
  activeCrisis: null,
  acceptContract: () => {},
  completeDeliveryContract: () => {},
  showSectorMap: () => {},
  discoverRace: () => {},
  knownRaces: ["synthetic"],
  ship: { cargo: [], tradeGoods: [] },
  activeExpedition: null,
  planetCooldowns: {},
});
const syntheticOfferMarkup = renderToStaticMarkup(createElement(PlanetPanel));
const acceptButton = syntheticOfferMarkup.match(
  /<button(?=[^>]*>ПРИНЯТЬ<\/button>)[^>]*>/,
);
assert.ok(acceptButton, "кнопка принятия контракта не отрисовалась");
assert.doesNotMatch(
  acceptButton[0],
  /\sdisabled(?:=|\s|>)/,
  "контракт должен приниматься с нулевым балансом кредитов",
);
assert.ok(
  syntheticOfferMarkup.includes("Завершить исследование технологии 2+ тира"),
  "предложение должно заранее объяснять исследовательскую цель",
);
assert.ok(
  !syntheticOfferMarkup.includes("Срок:"),
  "анализ данных Древних не должен показывать срок",
);

console.log("Contract label checks passed");
