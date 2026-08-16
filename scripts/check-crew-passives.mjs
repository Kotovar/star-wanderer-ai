/**
 * Пассивки экипажа: врождённые трейты, мутации, ветки прокачки 3/6/9 и
 * импланты. Проверяет не наличие данных, а то, что каждый эффект реально
 * кем-то читается — и читается по правильному кругу людей.
 */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const srcDir = path.join(root, "src");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": srcDir },
});

const { buildCrewMember } = jiti("../src/game/crew/buildCrewMember.ts");
const { CREW_TRAITS } = jiti("../src/game/constants/traits.ts");
const { AUGMENTATIONS, getRetrainedAugmentation } = jiti(
  "../src/game/constants/augmentations.ts",
);
const { calculateHealthRegen } = jiti(
  "../src/game/slices/crew/helpers/calculateHealthRegen.ts",
);
const { getTaskBonusMultiplier } = jiti(
  "../src/game/slices/gameLoop/processors/crewAssignments/constants.ts",
);
const { getCrewPerkNoEffectSource } = jiti("../src/game/crew/techPerks.ts");

const failures = [];
const check = (name, fn) => {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
};

// ─── Исходники для статических проверок ────────────────────────────────────

const collectSources = async (dir) => {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSources(full)));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
};

const sourceFiles = await collectSources(srcDir);
const sources = new Map(
  await Promise.all(
    sourceFiles.map(async (file) => [
      path.relative(root, file),
      await readFile(file, "utf8"),
    ]),
  ),
);

/** Типы — чистые объявления, упоминание ключа там ничего не значит. */
const TYPES_DIR = "src/game/types/";

/**
 * Таблицы данных: ключ там встречается уже в самом литерале эффекта, поэтому
 * засчитываем только настоящее чтение (`.key`, `"key"`) — рядом с таблицами
 * живут и хелперы вроде getAugmentationBonus.
 */
const DECLARATION_FILES = new Set([
  "src/game/constants/traits.ts",
  "src/game/constants/augmentations.ts",
]);

const readsKey = (text, key) =>
  new RegExp(`[.\`'"]${key}\\b`).test(text);

const isEffectUsed = (key) =>
  [...sources].some(([file, text]) => {
    if (file.startsWith(TYPES_DIR)) return false;
    if (DECLARATION_FILES.has(file)) return readsKey(text, key);
    return text.includes(key);
  });

// ─── 1. Ни один эффект не должен остаться мёртвым ──────────────────────────
// Ключ, который никто не читает, — это пассивка, которую игрок «получил», а
// она ничего не делает (так было с maxHappinessBonus).

check("мёртвые эффекты трейтов и мутаций", () => {
  const traitKeys = new Set();
  for (const list of Object.values(CREW_TRAITS)) {
    for (const trait of list) {
      for (const key of Object.keys(trait.effect ?? {})) traitKeys.add(key);
    }
  }

  const augmentationKeys = new Set();
  for (const augmentation of Object.values(AUGMENTATIONS)) {
    for (const key of Object.keys(augmentation.effect ?? {})) {
      augmentationKeys.add(key);
    }
  }

  const unused = [...traitKeys, ...augmentationKeys].filter(
    (key) => !isEffectUsed(key),
  );
  assert.deepEqual(
    unused,
    [],
    `эффекты объявлены, но нигде не читаются: ${unused.join(", ")}`,
  );
});

// ─── 2. Личные трейты считаются только по живым и по тем, кто на борту ─────
// Расовые трейты и ветки прокачки давно фильтруются через isWorkingCrew, а
// личные трейты по одному отставали: бунтарь дезертировал из боя, сидя на
// аванпосте за несколько секторов, а телепат оттуда же давил на весь корабль.

const FILTERED_TRAIT_SITES = [
  ["src/game/slices/combat/helpers/playerVictory.ts", "lootBonus"],
  ["src/game/slices/trade/helpers/sellTradeGood.ts", "sellPriceBonus"],
  ["src/game/slices/combat/helpers/startCombat.ts", "desertionRisk"],
  ["src/game/slices/gameLoop/processors/processOthers.ts", "moduleMorale"],
  [
    "src/game/slices/gameLoop/processors/crewAssignments/processTraits.ts",
    "shipMorale",
  ],
  ["src/game/components/SectorMap.tsx", "seeHostility"],
];

for (const [file, effectKey] of FILTERED_TRAIT_SITES) {
  check(`${file} фильтрует экипаж (${effectKey})`, () => {
    const text = sources.get(file);
    assert.ok(text, `файл не найден — переехал? ${file}`);
    assert.ok(
      text.includes(effectKey),
      `${file} больше не читает ${effectKey} — проверку надо перенести`,
    );
    assert.ok(
      text.includes("getLivingShipCrew"),
      `${file} читает ${effectKey} по нефильтрованному экипажу: труп и приписанный к аванпосту не должны в это попадать`,
    );
  });
}

// ─── 3. Регенерация: проценты применяются после всех плоских источников ────

check("regenBonus умножает и плоскую регенерацию тоже", () => {
  const expected = 11; // (раса 5 + мутация 5) * 1.1
  for (const traits of [
    ["invincible", "regeneration"],
    ["regeneration", "invincible"],
  ]) {
    const member = buildCrewMember({ race: "human", traits });
    const regen = calculateHealthRegen(member, {
      activeEffects: [],
      crew: [member],
    });
    assert.equal(
      regen,
      expected,
      `порядок трейтов ${traits.join("+")} не должен влиять на регенерацию`,
    );
  }
});

check("regenBonus без плоских источников ничего не ломает", () => {
  const member = buildCrewMember({ race: "krylorian", traits: ["invincible"] });
  const regen = calculateHealthRegen(member, {
    activeEffects: [],
    crew: [member],
  });
  assert.ok(regen >= 0, "регенерация не может уйти в минус");
});

// ─── 4. «Мастер» удваивает задание, а не затирает остальные бонусы ─────────

check("doubleTaskEffect складывается с taskBonus", () => {
  // Синтетик — у него нет настроения, значит нет и модификатора от морали
  const master = buildCrewMember({ race: "synthetic", traits: ["master"] });
  const both = buildCrewMember({
    race: "synthetic",
    traits: ["master", "experienced"],
  });
  assert.equal(getTaskBonusMultiplier(master), 2);
  assert.ok(
    Math.abs(getTaskBonusMultiplier(both) - 2.15) < 1e-9,
    `Мастер + Опытный должны дать ×2.15, получено ×${getTaskBonusMultiplier(both)}`,
  );
});

// ─── 5. Имплант при переучивании перенастраивается, а не пропадает ─────────

check("getRetrainedAugmentation держит ранг импланта", () => {
  // Дешёвый профильный имплант → дешёвый имплант новой профессии
  assert.equal(
    getRetrainedAugmentation("targeting_eye", "medic"),
    "accelerated_regen",
  );
  // Старший ранг сохраняется, если он есть у новой профессии
  assert.equal(
    getRetrainedAugmentation("survey_uplink", "scientist"),
    "quantum_memory_core",
  );
  // У пилота ранг один — зажимаем, а не теряем имплант
  assert.equal(
    getRetrainedAugmentation("combat_cognition", "pilot"),
    "neural_reflex",
  );
  // Расовый имплант от профессии не зависит
  assert.equal(getRetrainedAugmentation("phase_step", "gunner"), "phase_step");
  // Та же профессия и пустой слот — без изменений
  assert.equal(
    getRetrainedAugmentation("nano_hands", "engineer"),
    "nano_hands",
  );
  assert.equal(getRetrainedAugmentation(null, "pilot"), null);
});

check("любая профессия получает рабочий имплант после переучивания", () => {
  const professions = [
    "pilot",
    "engineer",
    "medic",
    "scout",
    "scientist",
    "gunner",
  ];
  for (const augmentation of Object.values(AUGMENTATIONS)) {
    if (!augmentation.forProfession) continue;
    for (const profession of professions) {
      const next = getRetrainedAugmentation(augmentation.id, profession);
      assert.equal(
        AUGMENTATIONS[next]?.forProfession,
        profession,
        `${augmentation.id} → ${profession} дал имплант чужой профессии: ${next}`,
      );
    }
  }
});

// ─── 6. Подсказка «этот выбор ничего не даст» ──────────────────────────────

check("ветка A стрелка сравнивается внутри своего отсека", () => {
  const first = buildCrewMember({
    id: 1,
    profession: "gunner",
    level: 3,
    moduleId: 10,
  });
  const second = buildCrewMember({
    id: 2,
    profession: "gunner",
    level: 3,
    moduleId: 20,
    techPerks: { 3: "A" },
  });
  const crew = [first, second];
  const gunnerIds = [1, 2];

  assert.equal(
    getCrewPerkNoEffectSource(crew, first, 3, "A", gunnerIds),
    null,
    "точность считается по каждому оружейному отсеку отдельно — стрелок в другом отсеке не делает перк бесполезным",
  );

  const sameBay = [first, { ...second, moduleId: 10 }];
  assert.equal(
    getCrewPerkNoEffectSource(sameBay, first, 3, "A", gunnerIds)?.id,
    2,
    "в одном отсеке работает только сильнейший стрелок — подсказка должна сработать",
  );
});

check("ветка A пилота бесполезна вне кабины", () => {
  const inCockpit = buildCrewMember({ id: 1, profession: "pilot", level: 3 });
  const spare = buildCrewMember({ id: 2, profession: "pilot", level: 3 });
  const crew = [inCockpit, spare];

  assert.equal(
    getCrewPerkNoEffectSource(crew, spare, 3, "A", [], 1)?.id,
    1,
    "уклонение даёт только старший пилот в кабине — запасному надо об этом сказать",
  );
  assert.equal(
    getCrewPerkNoEffectSource(crew, inCockpit, 3, "A", [], 1),
    null,
    "пилоту за штурвалом перк как раз работает",
  );
});

// ─── Итог ──────────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error("check-crew-passives: FAIL");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("check-crew-passives: OK");
