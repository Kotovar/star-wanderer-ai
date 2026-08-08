import assert from "node:assert/strict";
import { setUiState } from "./register-ui-loader.mjs";

/**
 * Рендерит экран сбора экспедиции и проверяет, что видит игрок.
 * Заведён после двух подряд ошибок одного рода: расчёт был верным, а показ
 * нет — сначала экран не учитывал low_gravity в сумме AP, потом печатал
 * совет «стоило просканировать» на населённой планете, где ни скана, ни
 * анализа, ни бурения не существует. Проверки по исходнику такое ловят
 * только задним числом, поэтому здесь именно разметка.
 */

const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { getPlanetFeatures, LOW_GRAVITY_EXPEDITION_AP } = await import(
  "../src/game/planets/features.ts"
);
const { store: i18nStore } = await import("../src/lib/useTranslation.ts");

/** Черты детерминированы по id, поэтому нужный id подбираем перебором. */
const planetIdWith = (feature, absent = []) => {
  for (let i = 0; i < 5000; i++) {
    const id = `probe-${i}`;
    const features = getPlanetFeatures(id);
    if (
      (feature === null || features.includes(feature)) &&
      absent.every((f) => !features.includes(f))
    ) {
      return id;
    }
  }
  throw new Error(`не нашёл планету с чертой ${feature}`);
};

const PLAIN_ID = planetIdWith(null, ["low_gravity"]);
const GRAVITY_ID = planetIdWith("low_gravity");

const CREW = [
  {
    id: 1,
    name: "Ari",
    race: "human",
    profession: "scout",
    level: 2,
    health: 100,
    maxHealth: 100,
    expeditionFatigue: 0,
  },
];

const planet = (overrides) => ({
  id: PLAIN_ID,
  name: "Проба",
  type: "planet",
  planetType: "Пустынная",
  ...overrides,
});

const build = (planetOverrides) =>
  setUiState({
    crew: CREW,
    research: { researchedTechs: [], resources: {}, unlockedRecipes: [] },
    ship: { modules: [] },
    startExpedition: () => {},
    currentSector: { tier: 1, locations: [planet(planetOverrides)] },
  });

const { PlanetExpeditionSetup } = await import(
  "../src/game/components/PlanetExpeditionSetup.tsx"
);

const render = (planetOverrides, planetId = PLAIN_ID) => {
  build(planetOverrides);
  return renderToStaticMarkup(
    createElement(PlanetExpeditionSetup, { planetId, onClose: () => {} }),
  );
};

const prepPeeksLabel = () => i18nStore.t("planet_panel.expedition_prep_peeks", { count: 4 });
const prepNoneLabel = () => i18nStore.t("planet_panel.expedition_prep_none");

// ── Населённая планета: подсказки о подготовке быть не должно ──────────────
const populated = render({ isEmpty: false, dominantRace: "human" });
assert.ok(
  !populated.includes(prepNoneLabel()),
  "совет о подготовке протёк на населённую планету, где ни скана, ни анализа, ни бурения нет",
);
assert.ok(
  !populated.includes(i18nStore.t("planet_panel.expedition_prep_peeks", { count: 0 }).slice(0, 12)),
  "строка о подсветке протекла на населённую планету",
);

// ── Необитаемая без подготовки: честное предупреждение ─────────────────────
const blind = render({ isEmpty: true, explored: true });
assert.ok(
  blind.includes(prepNoneLabel()),
  "на необитаемой планете без подготовки игрок обязан узнать, что садится вслепую",
);

// ── Необитаемая с подготовкой: скан 2 + два прохода бура = 4 ───────────────
const prepared = render({
  isEmpty: true,
  explored: true,
  orbitalScanned: true,
  drillsDone: 2,
});
assert.ok(
  prepared.includes(prepPeeksLabel()),
  `ожидалось 4 подсвеченных клетки, разметка их не показала`,
);
assert.ok(
  !prepared.includes(prepNoneLabel()),
  "после подготовки предупреждение о слепой высадке обязано исчезнуть",
);

// ── Низкая гравитация: сумма AP на экране совпадает с той, что даст высадка ─
const plainAp = render({ isEmpty: true, explored: true });
const gravityAp = render({ isEmpty: true, explored: true, id: GRAVITY_ID }, GRAVITY_ID);
const apValue = (markup) => {
  const match = markup.match(/text-white font-bold text-sm">(\d+)</);
  assert.ok(match, "не нашёл сумму AP в разметке — проверка бессмысленна");
  return Number(match[1]);
};
assert.equal(
  apValue(gravityAp) - apValue(plainAp),
  LOW_GRAVITY_EXPEDITION_AP,
  "экран сбора показывает не тот AP, что получит высадка",
);
assert.ok(
  gravityAp.includes(
    i18nStore.t("planet_panel.expedition_gravity_bonus", {
      count: LOW_GRAVITY_EXPEDITION_AP,
    }),
  ),
  "низкая гравитация не подписана — игрок не поймёт, откуда лишние AP",
);

// ── То же самое по-английски: ничего не застревает по-русски ───────────────
i18nStore.changeLanguage("en");
await new Promise((done) => setTimeout(done, 0));
assert.equal(
  i18nStore.t("planet_panel.expedition_prep_none").includes("blind"),
  true,
  "английский каталог не загрузился — проверка была бы бессмысленной",
);
const english = render({ isEmpty: true, explored: true, orbitalScanned: true });
assert.doesNotMatch(
  english,
  /[А-Яа-яЁё]/,
  "русский текст протёк в английский экран сбора экспедиции",
);
assert.ok(
  english.includes(i18nStore.t("planet_panel.expedition_prep_peeks", { count: 2 })),
  "подсветка не переведена",
);
i18nStore.changeLanguage("ru");

// ── Сырые ключи и неподставленные плейсхолдеры ─────────────────────────────
for (const markup of [populated, blind, prepared, gravityAp, english]) {
  assert.doesNotMatch(markup, /planet_panel\.\w+/, "сырой ключ перевода в разметке");
  assert.doesNotMatch(markup, /\{\{\w+\}\}/, "неподставленный плейсхолдер в разметке");
}

// Страховка от самообмана: фикстура обязана рендерить хоть что-то осмысленное.
assert.ok(
  blind.includes("Ari"),
  "экипаж не отрисовался — значит и остальные утверждения ничего не проверяли",
);

console.log("Expedition setup UI checks passed");
