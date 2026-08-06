import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [managementSource, savesSource] = await Promise.all([
  readFile(new URL("../src/game/slices/gameManagement/gameManagementSlice.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/game/saves/utils.ts", import.meta.url), "utf8"),
]);

const saveGameBody = managementSource.match(/saveGame:\s*\(\) => \{([\s\S]*?)\n\s*\},/)?.[1];

assert.ok(saveGameBody, "saveGame implementation exists");
assert.match(savesSource, /auto:\s*STORAGE_KEY/, "auto slot uses the legacy save key");
assert.match(saveGameBody, /saveSlot\("auto", state\)/, "autosave writes the auto slot");
assert.doesNotMatch(
  saveGameBody,
  /saveToLocalStorage\(/,
  "autosave serializes the legacy key only once through the auto slot",
);

console.log("autosave checks passed");
