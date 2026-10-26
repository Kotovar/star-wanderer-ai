import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "./register-ts-loader.mjs";

const { formatContractDescription } = await import(
  "../src/game/contracts/formatContractDescription.ts"
);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (file) => readFileSync(path.join(root, file), "utf8");

const planetPanel = source("src/game/components/PlanetPanel.tsx");
assert.match(
  planetPanel,
  /formatContractDescription\(c, t\)/,
  "available contract titles use the shared translated description",
);
const bountyTitle = JSON.parse(formatContractDescription({
  type: "bounty",
  desc: "contracts.desc_bounty",
  targetSectorName: "Сигма",
  targetThreat: 2,
}, (key, params) => JSON.stringify({ key, params })));
assert.equal(bountyTitle.params.sector, "Сигма", "contract titles interpolate a target sector");
assert.match(
  planetPanel,
  /· \{getContractDestinationText\(c, t\)\}/,
  "delivery offers must name their destination",
);

const contractsList = source("src/game/components/ContractsList.tsx");
assert.match(
  contractsList,
  /derelict_recovery:[\s\S]*?cleanse_curse: t\("contracts\.type_cleanse_curse"\)/,
  "active curse-cleansing contracts must show a translated type",
);

const contracts = source("src/game/contracts/generatePlanetContracts.ts");
const combatStart = contracts.indexOf('type: "combat" as const');
const combatEnd = contracts.indexOf("        },", combatStart);
assert.ok(combatStart >= 0 && combatEnd > combatStart);
assert.doesNotMatch(
  contracts.slice(combatStart, combatEnd),
  /timeLimit:/,
  "generic sector clearance must not have a deadline",
);

for (const locale of ["ru", "en"]) {
  const catalog = JSON.parse(source(`src/lib/locales/${locale}.json`));
  assert.equal(typeof catalog.common.confirm, "string");
}

const mapSource = source("src/game/components/GalaxyMap.tsx");
assert.match(
  mapSource,
  /const \[fuelWarning, setFuelWarning\]/,
  "a jump that strands the player must require confirmation",
);
assert.match(
  mapSource,
  /canSynthesizeFuel/,
  "fuel warning must distinguish ships that can synthesize fuel",
);
assert.match(
  source("src/game/galaxy/galaxy-map-utils.ts"),
  /sector\.visited\s*&&\s*sector\.locations\.some\(\(location\)\s*=>\s*location\.type === "station"\)/,
  "visited systems with a station must be marked on the galaxy map",
);

console.log("Start menu regression checks passed");
