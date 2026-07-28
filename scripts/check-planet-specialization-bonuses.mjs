import assert from "node:assert/strict";
import { getDiminishingPlanetBonus } from "../src/game/slices/planetEffects/helpers/diminishingBonus.ts";

assert.deepEqual(
    [
        getDiminishingPlanetBonus(0, 5, 1),
        getDiminishingPlanetBonus(5, 5, 1),
        getDiminishingPlanetBonus(8, 5, 1),
        getDiminishingPlanetBonus(9, 5, 1),
        getDiminishingPlanetBonus(10, 5, 1),
    ],
    [5, 3, 1, 1, 0],
    "Biolab health must taper to +10 HP",
);

assert.deepEqual(
    [
        getDiminishingPlanetBonus(0, 0.1, 100),
        getDiminishingPlanetBonus(0.1, 0.1, 100),
        getDiminishingPlanetBonus(0.15, 0.1, 100),
        getDiminishingPlanetBonus(0.18, 0.1, 100),
        getDiminishingPlanetBonus(0.19, 0.1, 100),
        getDiminishingPlanetBonus(0.2, 0.1, 100),
    ],
    [0.1, 0.05, 0.03, 0.01, 0.01, 0],
    "Dojo damage must taper to +20%",
);

console.log("Planet specialization bonus checks passed");
