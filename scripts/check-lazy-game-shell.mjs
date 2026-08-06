import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const stats = JSON.parse(
  await readFile(
    new URL("../.next/diagnostics/route-bundle-stats.json", import.meta.url),
    "utf8",
  ),
);
const homeRoute = stats.find((route) => route.route === "/");

assert.ok(homeRoute, "home route bundle stats exist");
assert.ok(
  homeRoute.firstLoadUncompressedJsBytes < 1_900_000,
  `game shell is deferred from the title screen (got ${homeRoute.firstLoadUncompressedJsBytes} bytes)`,
);

console.log(`first-load JS: ${homeRoute.firstLoadUncompressedJsBytes} bytes`);
