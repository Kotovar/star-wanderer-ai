import assert from "node:assert/strict";
import { getFirstLoadJsBytes } from "./first-load-js.mjs";

const firstLoadJsBytes = await getFirstLoadJsBytes();

assert.ok(
  firstLoadJsBytes < 1_900_000,
  `game shell is deferred from the title screen (got ${firstLoadJsBytes} bytes)`,
);

console.log(`first-load JS: ${firstLoadJsBytes} bytes`);
