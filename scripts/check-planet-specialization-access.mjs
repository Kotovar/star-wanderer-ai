import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jiti = require("jiti")(import.meta.url);
const { canUsePlanetSpecialization } = jiti(
    "../src/game/reputation/planetSpecializationAccess.ts",
);

assert.equal(
    canUsePlanetSpecialization(50),
    false,
    "Friendly relations must not unlock planet specializations",
);
assert.equal(
    canUsePlanetSpecialization(51),
    true,
    "Allied relations must unlock planet specializations",
);
assert.equal(canUsePlanetSpecialization(100), true);
assert.equal(canUsePlanetSpecialization(-100), false);

console.log("Planet specialization access checks passed");
