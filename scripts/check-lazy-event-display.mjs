import assert from "node:assert/strict";
import { getFirstLoadJsBytes } from "./first-load-js.mjs";

const firstLoadJsBytes = await getFirstLoadJsBytes();

assert.ok(
  firstLoadJsBytes < 2_400_000,
  `event display is deferred from the first load (got ${firstLoadJsBytes} bytes)`,
);

console.log(`first-load JS: ${firstLoadJsBytes} bytes`);
