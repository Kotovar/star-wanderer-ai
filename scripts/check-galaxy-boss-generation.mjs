import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { placeReservedBoss } from "../src/game/galaxy/reservedBosses.ts";

const oracle = { id: "void_oracle", name: "Void Oracle", bossType: "oracle" };
const eternal = { id: "the_eternal", name: "The Eternal", bossType: "eternal" };

for (let run = 0; run < 1000; run += 1) {
  const sectors = [
    ...Array.from({ length: 15 }, (_, id) => ({
      id,
      tier: 3,
      star: { type: id < 2 ? "blackhole" : "yellow_dwarf" },
      locations: Math.random() < 0.4 ? [{ id: `${id}-boss`, type: "boss", name: "Ancient", bossId: `random-${id}` }] : [],
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      id: index + 15,
      tier: 4,
      star: { type: Math.random() < 0.01 ? "blackhole" : "blue_giant" },
      locations: Math.random() < 0.5 ? [{ id: `${index}-boss`, type: "boss", name: "Ancient", bossId: `late-${index}` }] : [],
    })),
  ];

  const oracleSector = placeReservedBoss(sectors, oracle, {
    tier: 4,
    idSuffix: "void-oracle",
  });
  const eternalSector = placeReservedBoss(sectors, eternal, {
    blackHole: true,
    idSuffix: "eternal",
  });
  const bosses = sectors.flatMap((sector) => sector.locations);

  assert.equal(oracleSector?.tier, 4, "Оракул должен находиться в тире 4");
  assert.equal(eternalSector?.star?.type, "blackhole", "Вечный должен находиться у чёрной дыры");
  assert.equal(bosses.filter((boss) => boss.bossId === oracle.id).length, 1, "Оракул должен быть ровно один");
  assert.equal(bosses.filter((boss) => boss.bossId === eternal.id).length, 1, "Вечный должен быть ровно один");
}

const generatorSource = await readFile(
  new URL("../src/game/galaxy/generateGalaxy.ts", import.meta.url),
  "utf8",
);
assert.match(generatorSource, /reserveBosses\("void_oracle", "the_eternal"\)/);
assert.match(generatorSource, /ensureBlackHoles\(sectors\);/);
assert.match(generatorSource, /tier: 4,/);

console.log("Galaxy boss generation checks passed");
