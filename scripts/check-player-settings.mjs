import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};

const {
  PLAYER_SETTINGS_STORAGE_KEY,
  loadPlayerSettings,
  savePlayerSettings,
} = jiti("../src/game/slices/settings/playerSettings.ts");

const defaults = {
  animationsEnabled: true,
  soundEnabled: true,
  master: 0.8,
  music: 0.45,
  sfx: 0.7,
  ui: 0.45,
};
const profileSettings = { ...defaults, animationsEnabled: false, soundEnabled: false, music: 0.2 };

savePlayerSettings(profileSettings);
assert.deepEqual(loadPlayerSettings(defaults), profileSettings);

values.set(PLAYER_SETTINGS_STORAGE_KEY, "{");
assert.deepEqual(loadPlayerSettings(defaults), defaults);

const managementSource = readFileSync(
  path.join(root, "src/game/slices/gameManagement/gameManagementSlice.ts"),
  "utf8",
);
assert.match(
  managementSource,
  /saveSlot\(slotId, state, name\);\s*saveSlot\("auto", state\);/,
  "manual save must refresh Continue metadata together with its payload",
);
assert.match(
  managementSource,
  /\/\*\* Загрузить из любого слота \*\/[\s\S]*?saved\.settings = loadPlayerSettings\(normalizeAudioSettings\(saved\.settings\)\);/,
  "loading a slot must preserve profile settings",
);

const settingsSource = readFileSync(
  path.join(root, "src/game/slices/settings/settingsSlice.ts"),
  "utf8",
);
assert.match(
  settingsSource,
  /hydratePlayerSettings:/,
  "settings must hydrate from the player profile before Continue is shown",
);
assert.match(
  readFileSync(path.join(root, "src/app/page.tsx"), "utf8"),
  /useEffect\(\(\) => \{\s*hydratePlayerSettings\(\);\s*\}, \[hydratePlayerSettings\]\);/,
  "the title screen must hydrate player settings on page load",
);

console.log("Player settings checks passed");
