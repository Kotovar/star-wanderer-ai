import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const { RACES } = jiti("../src/game/constants/races.ts");
const { generateCrewTraits } = jiti("../src/game/crew/generation.ts");
const { buildCrewMember } = jiti("../src/game/crew/buildCrewMember.ts");
const raceIds = Object.keys(RACES);

const syntheticTraitSets = Array.from({ length: 200 }, (_, seed) =>
  generateCrewTraits("poor", seed, false, "scientist", "synthetic").traits,
);
assert.equal(
  syntheticTraitSets.flat().some((trait) => trait.type === "mutation"),
  false,
  "synthetic candidates cannot receive mutations",
);
assert.equal(
  syntheticTraitSets.flat().some((trait) => trait.id === "sickly"),
  false,
  "synthetic candidates do not receive biological Sickly traits",
);
assert.equal(
  syntheticTraitSets.flat().some((trait) => trait.id === "defective"),
  true,
  "synthetic candidates receive Defective instead of Sickly",
);

const syntheticMembers = Array.from({ length: 200 }, (_, seed) =>
  buildCrewMember({ race: "synthetic", profession: "scientist", traits: "poor", seed }),
);
assert.equal(
  syntheticMembers.some((member) => member.traits.some((trait) => trait.type === "mutation")),
  false,
  "buildCrewMember forwards the synthetic race to trait generation",
);

// ─── 1. Симметричность relations ─────────────────────────────────────────────
// Каскад репутации (ripple) использует relations только первичной расы,
// поэтому односторонняя запись делает каскад направленным — это баг данных.
// Пара может отсутствовать целиком (обе стороны undefined), но не наполовину.
for (const a of raceIds) {
  for (const b of raceIds) {
    if (a >= b) continue;
    const ab = RACES[a].relations?.[b];
    const ba = RACES[b].relations?.[a];
    assert.equal(
      ab,
      ba,
      `relations асимметричны: ${a}->${b}=${ab}, ${b}->${a}=${ba}`,
    );
  }
}

// ─── 2. Спрайт для каждой расы ───────────────────────────────────────────────
// RACE_SPRITES живёт в клиентском .tsx — проверяем текстом, чтобы не тащить JSX.
const spriteSource = readFileSync(
  path.join(root, "src/game/components/RaceSprite.tsx"),
  "utf8",
);
for (const raceId of raceIds) {
  assert.match(
    spriteSource,
    new RegExp(`^\\s+${raceId}: \\{ x:`, "m"),
    `нет спрайта для расы "${raceId}" в RaceSprite.tsx (иначе молча покажется human)`,
  );
}

// ─── 3. Паритет ключей локалей ru/en ─────────────────────────────────────────
const ru = require(path.join(root, "src/lib/locales/ru.json"));
const en = require(path.join(root, "src/lib/locales/en.json"));

// Каждый научный ресурс обязан иметь имя в blueprints.resources: стартовый
// экран и вкладка чертежей печатают ресурсы по этому словарю, и пропущенный
// показывается игроку сырым ключом
const resourceSource = readFileSync(
  path.join(root, "src/game/constants/research/resources.ts"),
  "utf8",
);
for (const [, id] of resourceSource.matchAll(/^ {4}(\w+): \{$/gm)) {
  for (const [lang, catalog] of [["ru", ru], ["en", en]]) {
    assert.ok(
      catalog.blueprints?.resources?.[id],
      `${lang}: нет blueprints.resources.${id} — ресурс покажется сырым ключом`,
    );
  }
}
const collectKeys = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? collectKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
const ruKeys = new Set(collectKeys(ru));
const enKeys = new Set(collectKeys(en));
const onlyRu = [...ruKeys].filter((key) => !enKeys.has(key));
const onlyEn = [...enKeys].filter((key) => !ruKeys.has(key));
assert.deepEqual(onlyRu, [], `ключи есть только в ru.json: ${onlyRu.join(", ")}`);
assert.deepEqual(onlyEn, [], `ключи есть только в en.json: ${onlyEn.join(", ")}`);

console.log(
  `Data consistency checks passed (${raceIds.length} races, ${ruKeys.size} locale keys)`,
);
