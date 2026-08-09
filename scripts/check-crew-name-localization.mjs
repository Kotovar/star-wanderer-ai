import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setUiState } from "./register-ui-loader.mjs";

const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { store: i18nStore } = await import("../src/lib/useTranslation.ts");
const { RACE_CREW_NAMES } = await import("../src/game/constants/races.ts");
const { buildCrewMember } = await import("../src/game/crew/buildCrewMember.ts");
const { getCrewDisplayName } = await import("../src/game/crew/crewNames.ts");
const { CrewMemberCard } = await import(
  "../src/game/components/CrewMemberCard.tsx"
);

const ru = JSON.parse(
  readFileSync(new URL("../src/lib/locales/ru.json", import.meta.url), "utf8"),
);
const en = JSON.parse(
  readFileSync(new URL("../src/lib/locales/en.json", import.meta.url), "utf8"),
);
const readKey = (catalog, key) =>
  key.split(".").reduce((value, part) => value?.[part], catalog);

const minimumPoolSizes = {
  human: 55,
  synthetic: 19,
  xenosymbiont: 15,
  krylorian: 15,
  voidborn: 15,
  crystalline: 14,
};
const ids = new Set();
for (const [race, names] of Object.entries(RACE_CREW_NAMES)) {
  assert.ok(
    names.length >= minimumPoolSizes[race],
    `${race} crew-name pool was not expanded`,
  );
  for (const definition of names) {
    assert.equal(ids.has(definition.id), false, `duplicate name id ${definition.id}`);
    ids.add(definition.id);
    const key = `crew_names.${definition.id}`;
    assert.equal(typeof readKey(ru, key), "string", `missing RU ${key}`);
    assert.equal(typeof readKey(en, key), "string", `missing EN ${key}`);
  }
}

const known = buildCrewMember({
  id: 1,
  name: "Смирнов",
  race: "human",
  profession: "pilot",
  moduleId: 1,
});
assert.equal(known.nameId, "human.smirnov");

const legacy = { ...known, nameId: undefined };
i18nStore.changeLanguage("ru");
assert.equal(getCrewDisplayName(legacy), "Смирнов");
i18nStore.changeLanguage("en");
await new Promise((done) => setTimeout(done, 0));
assert.equal(getCrewDisplayName(legacy), "Smirnov");
assert.equal(
  getCrewDisplayName({ ...legacy, name: "Custom Name" }),
  "Custom Name",
  "unknown saved names must stay unchanged",
);

setUiState({ outposts: [], galaxy: { sectors: [] } });
const markup = renderToStaticMarkup(
  createElement(CrewMemberCard, {
    crewMember: legacy,
    module: { id: 1, name: "Cockpit", type: "cockpit" },
    adjacentModules: [],
    isSelected: false,
    onSelect: () => {},
    onMove: () => {},
    onAssignTask: () => {},
  }),
);
assert.ok(markup.includes("Smirnov"));
assert.equal(markup.includes("Смирнов"), false);

i18nStore.changeLanguage("ru");
console.log("Crew name localization checks passed");
