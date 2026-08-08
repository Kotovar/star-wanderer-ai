import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./register-ts-loader.mjs";

/**
 * Панель исследований: иконки технологий и раскладка дерева.
 *
 * `TECH_ICON_ORDER` — массив, а не `Record<TechnologyId, ...>`, поэтому новая
 * технология не ломает типы: она просто остаётся без кадра, `rect` приходит
 * undefined и панель исследований падает на `rect.x`. Именно так и случилось
 * с `autonomous_systems`. Проверка требует, чтобы у каждой технологии
 * гарантированно было что показать.
 */

const { RESEARCH_TREE } = await import("../src/game/constants/research/index.ts");

const source = readFileSync(
  new URL("../src/game/components/TechIcon.tsx", import.meta.url),
  "utf8",
);

const listBetween = (label) => {
  const start = source.indexOf(label);
  assert.ok(start >= 0, `не нашёл ${label}`);
  return source.slice(start, source.indexOf("];", start));
};

const iconOrder = [
  ...listBetween("const TECH_ICON_ORDER").matchAll(/"([a-z0-9_]+)"/g),
].map(([, id]) => id);
const rectCount = (
  listBetween("const TECH_ICON_RECTS_IN_ORDER").match(/\{ x:/g) ?? []
).length;

// ── Списки идут парой по индексу ───────────────────────────────────────────
assert.equal(
  iconOrder.length,
  rectCount,
  "число технологий и число кадров разошлось — иконки съедут на соседние технологии, и заметить это можно очень нескоро",
);
assert.equal(
  new Set(iconOrder).size,
  iconOrder.length,
  "технология названа в порядке иконок дважды",
);

// ── Каждая технология из списка реально существует ─────────────────────────
for (const techId of iconOrder) {
  assert.ok(
    RESEARCH_TREE[techId],
    `${techId} есть в порядке иконок, но такой технологии нет — кадры сдвинуты`,
  );
}

// ── У каждой технологии есть что показать ──────────────────────────────────
const allTechs = Object.keys(RESEARCH_TREE);
const withSprite = new Set(iconOrder);
const withoutSprite = allTechs.filter((techId) => !withSprite.has(techId));

for (const techId of withoutSprite) {
  assert.ok(
    RESEARCH_TREE[techId].icon,
    `${techId} без кадра в спрайте и без эмодзи — панель исследований упадёт на нём`,
  );
}

// ── Запасной путь в компоненте на месте ────────────────────────────────────
assert.match(
  source,
  /if \(!rect\)/,
  "нет запасного пути для технологии без кадра — панель снова упадёт на rect.x",
);
assert.match(
  source,
  /TECH_ICON_ORDER\.length !== TECH_ICON_RECTS_IN_ORDER\.length/,
  "снят инвариант длины списков",
);


// ── Ни одно название технологии не должно повторяться ──────────────────────
// Два узла с одинаковой подписью в дереве неотличимы: `combat_drones` уже
// назывались «Автономные системы», и новая технология совпала с ними.
const translations = readFileSync(
  new URL("../src/lib/techTranslations.ts", import.meta.url),
  "utf8",
);
for (const lang of ["ru", "en"]) {
  const block = translations.slice(
    translations.indexOf(`\n  ${lang}: {`),
    translations.indexOf("\n  },", translations.indexOf(`\n  ${lang}: {`)),
  );
  const byName = new Map();
  for (const [, techId, name] of block.matchAll(
    /^ {4}([a-z0-9_]+): \{\s*\n\s*name: "([^"]+)"/gm,
  )) {
    const seen = byName.get(name);
    assert.ok(
      !seen,
      `${lang}: «${name}» носят и ${seen}, и ${techId} — в дереве их не различить`,
    );
    byName.set(name, techId);
  }
  assert.ok(byName.size > 30, `${lang}: разбор названий сломался, найдено ${byName.size}`);
}

// Условие постройки должно быть сказано в самой технологии, а не только
// всплывать отказом на панели гиганта
for (const [lang, needle] of [["ru", "ядра шторма"], ["en", "storm core"]]) {
  const block = translations.slice(translations.indexOf(`\n  ${lang}: {`));
  const entry = block.slice(block.indexOf("autonomous_systems:"));
  assert.ok(
    entry.slice(0, 600).includes(needle),
    `${lang}: технология не предупреждает, что газосборник требует нырка до ядра шторма`,
  );
}

console.log("Research panel checks passed");
console.log(
  `  ${iconOrder.length} технологий со спрайтом, ${withoutSprite.length} на эмодзи${
    withoutSprite.length > 0 ? `: ${withoutSprite.join(", ")}` : ""
  }`,
);

// ── Раскладка дерева ───────────────────────────────────────────────────────

const panel = readFileSync(
  new URL("../src/game/components/ResearchPanel.tsx", import.meta.url),
  "utf8",
);
const layoutBlock = panel.slice(
  panel.indexOf("const TREE_LAYOUT"),
  panel.indexOf("};", panel.indexOf("const TREE_LAYOUT")),
);
const layout = Object.fromEntries(
  [...layoutBlock.matchAll(/^\s+([a-z0-9_]+): \[([\d.]+), ([\d.]+)\]/gm)].map(
    ([, id, col, row]) => [id, [Number(col), Number(row)]],
  ),
);

assert.deepEqual(
  Object.keys(layout).sort(),
  allTechs.sort(),
  "раскладка дерева разошлась со списком технологий",
);

// Две карточки в одной клетке налезут друг на друга
const cells = new Map();
for (const [id, [col, row]] of Object.entries(layout)) {
  const cell = `${col}:${row}`;
  assert.ok(
    !cells.has(cell),
    `${id} и ${cells.get(cell)} стоят в одной клетке ${cell}`,
  );
  cells.set(cell, id);
}

// buildEdgePath ведёт линию от правого края предпосылки к левому краю
// потомка. Если они в одном столбце, конец оказывается левее начала и связь
// загибается назад — поэтому потомок обязан стоять правее.
for (const techId of allTechs) {
  for (const prereqId of RESEARCH_TREE[techId].prerequisites) {
    assert.ok(
      layout[techId][0] > layout[prereqId][0],
      `${techId} стоит не правее своей предпосылки ${prereqId} — линия связи загнётся назад`,
    );
  }
}

// Холст обязан считаться из раскладки: захардкоженная высота уже приводила
// к тому, что новый узел оказывался за её пределами и просто не рисовался
assert.match(
  panel,
  /MAX_ROW = Math\.max/,
  "высота холста снова задана числом, а не выведена из раскладки",
);

console.log(
  `  раскладка: ${Object.keys(layout).length} узлов, ${cells.size} занятых клеток, связи не загибаются`,
);
