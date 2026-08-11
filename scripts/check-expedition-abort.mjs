import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const sourceFile = (base) =>
  [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts")].find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );
const rewardsFixture = `
export const collectExpeditionRewards = (rewards, set) => {
  set((state) => ({ credits: state.credits + rewards.credits }));
};`;
const soundsFixture = `export const playSound = () => {};`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier === "./collectExpeditionRewards" &&
      context.parentURL?.endsWith("/endExpedition.ts")
    ) {
      return {
        url: `data:text/javascript,${encodeURIComponent(rewardsFixture)}`,
        shortCircuit: true,
      };
    }
    if (specifier === "@/sounds") {
      return {
        url: `data:text/javascript,${encodeURIComponent(soundsFixture)}`,
        shortCircuit: true,
      };
    }
    const parent = context.parentURL
      ? dirname(fileURLToPath(context.parentURL))
      : process.cwd();
    const base = specifier.startsWith("@/")
      ? resolve(process.cwd(), "src", specifier.slice(2))
      : specifier.startsWith(".") && !extname(specifier)
        ? resolve(parent, specifier)
        : null;
    const file = base ? sourceFile(base) : null;
    return file
      ? { url: pathToFileURL(file).href, shortCircuit: true }
      : nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".json")) {
      return {
        format: "module",
        source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`,
        shortCircuit: true,
      };
    }
    if (url.endsWith(".ts") || url.endsWith(".tsx")) {
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
          fileName: fileURLToPath(url),
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const { abortExpedition, endExpedition } = await import(
  "../src/game/slices/locations/helpers/expedition/endExpedition.ts"
);
assert.equal(typeof abortExpedition, "function");

const createState = () => {
  const planet = { id: "planet-1", expeditionCompleted: false };
  const sector = { id: 1, locations: [planet] };
  return {
    turn: 12,
    credits: 50,
    activeExpedition: {
      planetId: planet.id,
      crewIds: [1],
      rewards: {
        credits: 500,
        tradeGoods: [],
        researchResources: [],
        artifactFound: null,
      },
    },
    crew: [
      {
        id: 1,
        race: "human",
        profession: "scout",
        happiness: 80,
        expeditionFatigue: 0,
        movedThisTurn: true,
      },
    ],
    currentLocation: planet,
    currentSector: sector,
    galaxy: { sectors: [sector] },
  };
};

const run = (finishExpedition) => {
  const state = createState();
  const logs = [];
  let experienceCalls = 0;
  let statsUpdates = 0;
  let nextTurnCalls = 0;
  let activeExpeditionAtTick;
  let saveCalls = 0;
  const set = (update) => {
    const next = typeof update === "function" ? update(state) : update;
    if (next) Object.assign(state, next);
  };
  const get = () => ({
    ...state,
    addLog: (message, type) => logs.push({ message, type }),
    gainExp: () => {
      experienceCalls += 1;
    },
    updateShipStats: () => {
      statsUpdates += 1;
    },
    nextTurn: () => {
      nextTurnCalls += 1;
      activeExpeditionAtTick = state.activeExpedition;
      state.turn += 1;
      state.crew = state.crew.map((member) => ({ ...member, movedThisTurn: false }));
    },
    saveGame: () => {
      saveCalls += 1;
    },
  });

  finishExpedition(set, get);
  return {
    activeExpeditionAtTick,
    experienceCalls,
    logs,
    nextTurnCalls,
    saveCalls,
    state,
    statsUpdates,
  };
};

const aborted = run(abortExpedition);
assert.equal(aborted.state.activeExpedition, null);
assert.equal(aborted.state.turn, 13);
assert.equal(aborted.state.credits, 50);
assert.equal(aborted.experienceCalls, 0);
assert.equal(aborted.state.currentLocation.expeditionCompleted, false);
assert.equal(aborted.state.crew[0].expeditionFatigue, 5);
assert.equal(aborted.state.crew[0].happiness, 70);
assert.equal(aborted.state.crew[0].movedThisTurn, false);
assert.equal(aborted.statsUpdates, 1);
assert.equal(aborted.nextTurnCalls, 1);
assert.equal(aborted.activeExpeditionAtTick, null);
assert.ok(aborted.saveCalls >= 1);

const completed = run(endExpedition);
assert.equal(completed.state.activeExpedition, null);
assert.equal(completed.state.turn, 13);
assert.equal(completed.state.credits, 550);
assert.equal(completed.experienceCalls, 1);
assert.equal(completed.state.currentLocation.expeditionCompleted, true);
assert.equal(completed.nextTurnCalls, 1);
assert.equal(completed.activeExpeditionAtTick, null);
assert.equal(completed.state.crew[0].expeditionFatigue, 5);
assert.ok(completed.saveCalls >= 1);

const ru = JSON.parse(
  readFileSync(new URL("../src/lib/locales/ru.json", import.meta.url), "utf8"),
);
const en = JSON.parse(
  readFileSync(new URL("../src/lib/locales/en.json", import.meta.url), "utf8"),
);
assert.equal(aborted.logs.at(-1)?.message, ru.game_logs.abortExpedition_1);
assert.equal(typeof en.game_logs.abortExpedition_1, "string");

console.log("Expedition abort checks passed");
