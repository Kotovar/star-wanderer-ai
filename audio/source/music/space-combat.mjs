const TAU = Math.PI * 2;

export const COMBAT_SCORE = Object.freeze({
  title: "Space Combat",
  bpm: 96,
  loopSeconds: 96,
  sampleRate: 44_100,
});

const cycleWave = (cycles, frame, frames) => Math.sin((TAU * cycles * frame) / frames);

const gate = (cycles, frame, frames, shape) =>
  Math.sin(Math.PI * ((frame * cycles) / frames - Math.floor((frame * cycles) / frames))) ** shape;

/** Deterministic, loop-safe industrial combat bed without a lead melody. */
export function renderCombatLoop() {
  const frames = COMBAT_SCORE.loopSeconds * COMBAT_SCORE.sampleRate;
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);

  for (let frame = 0; frame < frames; frame += 1) {
    const lowPulse = cycleWave(4_608, frame, frames) * gate(192, frame, frames, 10) * 0.32;
    const metallicTick = (
      cycleWave(69_120, frame, frames) + cycleWave(103_680, frame, frames) * 0.45
    ) * gate(48, frame, frames, 22) * 0.09;
    const subDrone = cycleWave(2_304, frame, frames) * 0.24 + cycleWave(4_608, frame, frames) * 0.055;
    const value = Math.tanh((lowPulse + metallicTick + subDrone) * 1.1);
    const width = cycleWave(3, frame, frames) * 0.018;

    left[frame] = value - width;
    right[frame] = value + width;
  }

  return { left, right, sampleRate: COMBAT_SCORE.sampleRate, frames };
}
