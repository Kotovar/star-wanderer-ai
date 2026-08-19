import assert from "node:assert/strict";
import "./register-ts-loader.mjs";

const { getExpeditionScanPulsePosition, shouldAnimateExpeditionScan } = await import(
  "../src/game/components/expeditionScanPulse.ts"
);

assert.deepEqual(getExpeditionScanPulsePosition(0), { left: "10%", top: "10%" });
assert.deepEqual(getExpeditionScanPulsePosition(12), { left: "50%", top: "50%" });
assert.deepEqual(getExpeditionScanPulsePosition(24), { left: "90%", top: "90%" });

assert.equal(shouldAnimateExpeditionScan(true, false), true);
assert.equal(shouldAnimateExpeditionScan(false, false), false);
assert.equal(shouldAnimateExpeditionScan(true, true), false);

console.log("Expedition scan pulse checks passed.");
