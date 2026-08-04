import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

const moduleStubs = {
  "@/game/constants/randomEvents": "export const pickRandomEvent = () => undefined;",
  "@/game/crew": "export const giveRandomBondingTrait = () => null; export const shiftHappiness = (crew) => crew;",
  "@/game/crew/relationEvents": "export const rollCrewRelationEvent = () => null;",
  "@/game/effects/timedEffects": "export const grantTimedEffect = () => {};",
  "@/sounds": "export const playSound = () => {};",
};

register(
  `data:text/javascript,${encodeURIComponent(`
    import { existsSync, readFileSync, statSync } from "node:fs";
    import { fileURLToPath } from "node:url";
    let srcRoot;
    let moduleStubs;
    export function initialize(data) { ({ srcRoot, moduleStubs } = data); }
    export function resolve(specifier, context, nextResolve) {
      if (moduleStubs[specifier]) {
        return {
          url: "data:text/javascript," + encodeURIComponent(moduleStubs[specifier]),
          shortCircuit: true,
        };
      }
      const target = specifier.startsWith("@/")
        ? new URL(specifier.slice(2), srcRoot)
        : specifier.startsWith(".")
          ? new URL(specifier, context.parentURL)
          : null;
      const resolved = target && ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]
        .map((suffix) => new URL(target.href + suffix))
        .find((url) => existsSync(fileURLToPath(url)) && statSync(fileURLToPath(url)).isFile());
      return nextResolve(resolved?.href ?? specifier, context);
    }
    export function load(url, context, nextLoad) {
      if (url.endsWith(".json")) {
        return {
          format: "module",
          source: "export default " + readFileSync(new URL(url), "utf8"),
          shortCircuit: true,
        };
      }
      return nextLoad(url, context);
    }
  `)}`,
  import.meta.url,
  {
    data: {
      srcRoot: new URL("../src/", import.meta.url).href,
      moduleStubs,
    },
  },
);
const { canUseRandomEventChoice, resolveRandomEvent } = await import(
  "../src/game/slices/gameLoop/processors/processRandomEvents.ts",
);

const event = { type: "storm", damage: 10, targetModuleId: 1 };

const createState = (researchedTechs) => ({
  crew: [],
  research: { researchedTechs },
  ship: {
    shields: 8,
    modules: [{ id: 1, health: 100 }],
  },
  pendingRandomEvent: event,
  scheduledRandomEventConsequence: null,
  turn: 7,
  addLog: () => {},
  updateShipStats: () => {},
  saveGame: () => {},
});

const withoutStormShields = createState([]);
const withStormShields = createState(["storm_shields"]);

assert.equal(
  canUseRandomEventChoice(withoutStormShields, event, "technology"),
  false,
);
assert.equal(
  canUseRandomEventChoice(withStormShields, event, "technology"),
  true,
);
assert.equal(
  canUseRandomEventChoice(withStormShields, { type: "capsule", reward: 20 }, "technology"),
  false,
);

const state = withStormShields;
const set = (update) =>
  Object.assign(state, typeof update === "function" ? update(state) : update);

resolveRandomEvent("technology", set, () => state);
assert.equal(state.ship.modules[0].health, 95);
assert.equal(state.ship.shields, 8);
assert.equal(state.pendingRandomEvent, null);
assert.equal(state.scheduledRandomEventConsequence.choice, "technology");

const ru = JSON.parse(readFileSync(new URL("../src/lib/locales/ru.json", import.meta.url)));
const en = JSON.parse(readFileSync(new URL("../src/lib/locales/en.json", import.meta.url)));

assert.equal(ru.random_events.storm.title, "Энергетический фронт");
assert.equal(en.random_events.storm.title, "Energy Front");
assert.equal(ru.locations.cosmic_storm, "Космический шторм");
assert.equal(en.locations.cosmic_storm, "Cosmic storm");

console.log("Random event storm shields checks passed");
