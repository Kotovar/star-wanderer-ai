const TAU = Math.PI * 2;

export const EXPLORATION_SCORE = Object.freeze({
  title: "Space Exploration",
  bpm: 64,
  loopSeconds: 96,
  sampleRate: 44_100,
  textureBoundarySeconds: 1.5,
  // Integer cycle counts keep the tonal bed continuous at the file boundary.
  chords: [
    [3524, 4190, 5279], // D minor
    [2797, 3524, 4190], // B-flat major
    [4190, 4983, 6278], // F minor color
    [3139, 3734, 4709], // C minor, resolves into the next D minor pass
  ],
});

const wave = (cycles, time) => Math.sin((TAU * cycles * time) / EXPLORATION_SCORE.loopSeconds);

const smoothStep = (value) => value * value * (3 - 2 * value);

const chordMix = (time) => {
  const sectionSeconds = EXPLORATION_SCORE.loopSeconds / EXPLORATION_SCORE.chords.length;
  const section = Math.floor(time / sectionSeconds) % EXPLORATION_SCORE.chords.length;
  const local = time - section * sectionSeconds;
  const transition = Math.min(1, local / 3);
  return {
    previous: EXPLORATION_SCORE.chords[(section + EXPLORATION_SCORE.chords.length - 1) % EXPLORATION_SCORE.chords.length],
    current: EXPLORATION_SCORE.chords[section],
    amount: smoothStep(transition),
  };
};

const mulberry32 = (seed) => () => {
  let value = (seed += 0x6d2b79f5);
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
};

/**
 * Original textual score rendered as a seamless stereo exploration loop.
 * The non-periodic filtered texture fades through the loop boundary while the
 * drone/pulse layers use integral cycle counts, so the encoded file can loop
 * without a click or a separate runtime crossfade layer.
 */
export function renderExplorationLoop() {
  const { loopSeconds, sampleRate, textureBoundarySeconds } = EXPLORATION_SCORE;
  const frames = loopSeconds * sampleRate;
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const random = mulberry32(0x5a17e2);
  let filteredNoise = 0;

  for (let index = 0; index < frames; index += 1) {
    const time = index / sampleRate;
    const { previous, current, amount } = chordMix(time);
    const chord = previous.map((cycles, voice) => {
      const oldTone = wave(cycles, time);
      const newTone = wave(current[voice], time);
      return oldTone * (1 - amount) + newTone * amount;
    });
    const upperChord = previous.map((cycles, voice) => {
      const oldTone = wave(cycles * 8, time);
      const newTone = wave(current[voice] * 8, time);
      return oldTone * (1 - amount) + newTone * amount;
    });

    const lowDrone = chord[0] * 0.27 + chord[1] * 0.09 + chord[2] * 0.045;
    const airHarmonics = upperChord[0] * 0.045 + upperChord[1] * 0.02 + upperChord[2] * 0.01;
    const slowMovement = wave(2, time) * 0.018 + wave(5, time) * 0.012;
    filteredNoise += ((random() * 2 - 1) - filteredNoise) * 0.004;
    const textureBoundary = Math.min(
      1,
      time / textureBoundarySeconds,
      (loopSeconds - time) / textureBoundarySeconds,
    );
    const texture = filteredNoise * 0.05 * Math.max(0, textureBoundary);

    // Twelve very slow pulses per loop; this is texture, not a melody or beat layer.
    const pulsePhase = (time * 12) / loopSeconds;
    const pulseEnvelope = Math.sin(Math.PI * (pulsePhase - Math.floor(pulsePhase))) ** 6;
    const pulse = wave(5280, time) * pulseEnvelope * 0.055;
    const value = Math.tanh((lowDrone + airHarmonics + slowMovement + texture + pulse) * 0.82);
    const width = wave(3, time) * 0.018;

    left[index] = value - width;
    right[index] = value + width;
  }

  return { left, right, sampleRate, frames };
}
