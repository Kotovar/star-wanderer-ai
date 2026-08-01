import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sources = [];
const gains = [];

class FakeAudioParam {
  value = 1;
  ramps = [];

  cancelScheduledValues() {}

  setValueAtTime(value) {
    this.value = value;
  }

  setTargetAtTime(value) {
    this.value = value;
  }

  linearRampToValueAtTime(value, time) {
    this.value = value;
    this.ramps.push([value, time]);
  }
}

class FakeGain {
  constructor(context) {
    this.context = context;
    this.gain = new FakeAudioParam();
  }

  connect() {}
}

class FakeBufferSource {
  started = false;
  stopTimes = [];
  stopTime = undefined;
  onended = null;
  loop = false;
  buffer = null;
  playbackRate = new FakeAudioParam();

  connect(destination) {
    if (!gains.includes(destination)) gains.push(destination);
  }

  start() {
    this.started = true;
  }

  stop(time) {
    this.stopTimes.push(time);
    this.stopTime = time;
  }
}

class FakeAudioContext {
  currentTime = 0;
  destination = {};
  state = "running";

  createGain() {
    return new FakeGain(this);
  }

  createBufferSource() {
    const source = new FakeBufferSource();
    sources.push(source);
    return source;
  }

  decodeAudioData() {
    return Promise.resolve({});
  }

  resume() {
    return Promise.resolve();
  }
}

globalThis.window = { AudioContext: FakeAudioContext };
globalThis.fetch = async () => ({
  ok: true,
  arrayBuffer: async () => new ArrayBuffer(0),
});

const flushPromises = async () => {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
};

const { startMusic } = await import("../src/sounds/utils.ts");
startMusic("exploration");
await flushPromises();
startMusic("combat");
await flushPromises();

assert.equal(sources.length, 2);
assert.equal(sources[0].stopTimes.length, 1, "old loop stops only after fade");
assert.equal(sources[0].stopTimes[0], 1.53, "old loop stops after the fade completes");
assert.equal(sources[1].started, true, "incoming loop starts");
assert.deepEqual(gains[1].gain.ramps.at(-1), [1, 1.5], "incoming gain fades in");
assert.deepEqual(gains[0].gain.ramps.at(-1), [0, 1.5], "outgoing gain fades out");

gains[1].context.currentTime = 0.2;
startMusic("exploration");
await flushPromises();

assert.equal(sources.length, 3, "returning to exploration creates its next loop");
assert.equal(
  sources.filter((source) => source.stopTime === undefined || source.stopTime > 0.2).length,
  2,
  "a new handoff does not leave an earlier fading loop alive",
);
assert.equal(sources[0].stopTime, 0.2, "the earlier fading loop stops at the new handoff");

const pageSource = await readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8");
assert.match(pageSource, /startMusic\(inCombat \? "combat" : "exploration"\)/);
assert.match(
  pageSource,
  /useEffect\(\(\) => \(\) => stopMusic\(\), \[\]\);/,
  "unmount stops music",
);
assert.doesNotMatch(
  pageSource,
  /startMusic\(inCombat \? "combat" : "exploration"\);\s*return \(\) => stopMusic\(\);/,
  "selecting music does not cancel its transition",
);

console.log("Music transition checks passed.");
