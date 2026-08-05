import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const emptyPlanetPanel = read("src/game/components/EmptyPlanetPanel.tsx");
const planetPanel = read("src/game/components/PlanetPanel.tsx");
const expeditionPanel = read("src/game/components/PlanetExplorationPanel.tsx");
const wreckFieldPanel = read("src/game/components/WreckFieldPanel.tsx");
const ru = JSON.parse(read("src/lib/locales/ru.json"));
const en = JSON.parse(read("src/lib/locales/en.json"));

assert.match(emptyPlanetPanel, /aria-live="polite"/);
assert.match(emptyPlanetPanel, /lg:h-full/);
assert.match(planetPanel, /lg:h-full/);
assert.match(planetPanel, /lg:flex lg:flex-col/);
assert.match(
  planetPanel,
  /max-h-75.*lg:max-h-none.*lg:min-h-0.*lg:flex-1/,
);
const leavePlanetIndex = planetPanel.indexOf('t("planet_panel.leave_planet")');
const planetDescriptionIndex = planetPanel.indexOf(
  'className="mt-1 max-w-2xl text-sm italic leading-relaxed text-[#b5c1c6]"',
);
assert.ok(planetDescriptionIndex > leavePlanetIndex);
assert.ok(!wreckFieldPanel.includes("wreck_field.radiation_notice"));
assert.ok(!ru.random_events.crew_dispute.description.includes("{{penalty}}"));
assert.ok(!en.random_events.crew_dispute.description.includes("{{penalty}}"));
assert.match(expeditionPanel, /sticky top-0/);
assert.match(expeditionPanel, /px-2 py-1\.5/);
assert.match(expeditionPanel, /canEndExpedition/);
assert.match(expeditionPanel, /xl:flex-row/);
assert.match(expeditionPanel, /lg:hidden/);
const scanControlsIndex = expeditionPanel.indexOf("/* Scan controls */");
const finishedStatusIndex = expeditionPanel.indexOf(
  't("planet_panel.expedition_finished")',
);
assert.ok(finishedStatusIndex > 0 && finishedStatusIndex < scanControlsIndex);
assert.ok(!expeditionPanel.includes("/* Finished state */"));
assert.match(expeditionPanel, /finished \? "polite" : "off"/);
assert.match(expeditionPanel, /finished \? "" : "invisible"/);
assert.match(expeditionPanel, /h-7 w-48 shrink-0/);
assert.match(expeditionPanel, /onClick=\{canEndExpedition \? endExpedition/);

console.log("Live-testing polish checks passed");
