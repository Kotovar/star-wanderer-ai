import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { SFX_PRESETS } from "../audio/source/sfx/presets.mjs";
import { SYNTH_SAMPLE_RATE, SYNTH_SOUNDS } from "../audio/source/sfx/combat-synth.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registryUrl = pathToFileURL(resolve(root, "src/sounds/utils.ts")).href;
const combatLoopSource = readFileSync(
  resolve(root, "audio/source/music/space-combat.mjs"),
  "utf8",
);
const requiredVariantIds = [
  "combat_kinetic",
  "combat_laser",
  "combat_enemy_fire",
  "ui_confirm",
  "ui_cancel",
  "ui_error",
];

const fail = (message) => {
  throw new Error(`[audio] ${message}`);
};

const runAudioTool = (tool, args) => {
  const result = spawnSync(tool, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  // The workspace sandbox can report EPERM after a completed child process.
  // Its captured output and zero status are still the successful tool result.
  if (result.error && result.status !== 0) {
    throw result.error;
  }
  if (result.status !== 0) fail(`${tool} failed for ${args.at(-1)}`);
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
};

const inspectOpus = (file) => {
  if (!readFileSync(file).subarray(0, 4).equals(Buffer.from("OggS"))) {
    fail(`${file} is not an OGG container`);
  }

  const codec = runAudioTool(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "stream=codec_name",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ],
  ).trim();
  if (codec !== "opus") fail(`${file} uses ${codec || "no"} audio codec, expected opus`);

  const volumeLog = runAudioTool(
    "ffmpeg",
    ["-hide_banner", "-i", file, "-af", "volumedetect", "-f", "null", "-"],
  );
  const peak = /max_volume:\s*(-?[\d.]+) dB/.exec(volumeLog)?.[1];
  if (peak === undefined || Number(peak) > -1.8) {
    fail(`${file} exceeds the -2 dB peak ceiling (${peak ?? "unknown"} dB)`);
  }
  return Number(peak);
};

const getDuration = (file) =>
  Number(
    runAudioTool(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        file,
      ],
    ).trim(),
  );

const getAudibleBandMean = (file) => {
  const audibleBandLog = runAudioTool(
    "ffmpeg",
    ["-hide_banner", "-i", file, "-af", "highpass=f=180,volumedetect", "-f", "null", "-"],
  );
  const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(audibleBandLog)?.[1];
  if (mean === undefined) {
    fail(`${file} has insufficient audible-range energy (${mean ?? "unknown"} dB)`);
  }
  return Number(mean);
};

const inspectMusicAudibility = (file) => {
  if (getAudibleBandMean(file) < -40) {
    fail(`${file} has insufficient audible-range energy`);
  }
};

const inspectEffectAudibility = (id, sound, file, duration, peak) => {
  const minimumDuration = sound.category === "ui" ? 0.08 : 0.06;
  if (!Number.isFinite(duration) || duration < minimumDuration) {
    fail(`${id} is too short (${duration.toFixed(3)}s, minimum ${minimumDuration}s): ${file}`);
  }

  const mixGain = DEFAULT_AUDIO_VOLUMES.master
    * DEFAULT_AUDIO_VOLUMES[sound.category]
    * sound.gain;
  const mixedPeak = peak + 20 * Math.log10(mixGain);
  if (!Number.isFinite(mixedPeak) || mixedPeak < -34) {
    fail(`${id} is too quiet at default mix (${mixedPeak.toFixed(1)} dBFS): ${file}`);
  }

  const mixedAudibleMean = getAudibleBandMean(file) + 20 * Math.log10(mixGain);
  if (!Number.isFinite(mixedAudibleMean) || mixedAudibleMean < -40) {
    fail(`${id} has insufficient audible-range energy at default mix (${mixedAudibleMean.toFixed(1)} dBFS): ${file}`);
  }
};

const { SOUND_REGISTRY, MUSIC_REGISTRY, DEFAULT_AUDIO_VOLUMES } = await import(registryUrl);
if (!SOUND_REGISTRY || !MUSIC_REGISTRY || !DEFAULT_AUDIO_VOLUMES) {
  fail("SOUND_REGISTRY, MUSIC_REGISTRY, and DEFAULT_AUDIO_VOLUMES must be exported");
}

for (const id of ["exploration", "combat"]) {
  if (!MUSIC_REGISTRY[id]) fail(id + " must be registered as music");
}

if (/\bgatedNoise\b/.test(combatLoopSource)) {
  fail("combat music must not mix gated random noise");
}

for (const id of requiredVariantIds) {
  const urls = SOUND_REGISTRY[id]?.urls;
  if (!urls || urls.length !== 3) fail(`${id} must expose exactly three variants`);
}

// Выстрелы больше не пресеты jsfxr: у каждого свой слоёный рендер.
for (const id of Object.keys(SYNTH_SOUNDS)) {
  if (SFX_PRESETS[id]) fail(`${id} must be synthesised in combat-synth.mjs, not duplicated as a jsfxr preset`);
}
for (const id of ["combat_laser", "combat_kinetic", "combat_enemy_fire"]) {
  if (SYNTH_SOUNDS[id]?.variants.length !== 3) {
    fail(`${id} must keep three generated variants`);
  }
}
const laserSource = readFileSync(
  resolve(root, "audio/source/sfx/combat-synth.mjs"),
  "utf8",
);
const laserSweep = /freq: \[2050 \* pitch, (\d+) \* pitch\]/.exec(laserSource);
if (!laserSweep || Number(laserSweep[1]) >= 2050) {
  fail("combat_laser must be a falling discharge, not a rising chirp");
}
for (const [id, definition] of Object.entries(SYNTH_SOUNDS)) {
  for (const [index, renderVariant] of definition.variants.entries()) {
    const samples = renderVariant();
    let peak = 0;
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    // Кодек добавляет свой овершут: без запаса в исходнике ogg вылезает за
    // потолок -2 dB, который проверяется ниже уже по файлу.
    if (peak > 0.55) fail(`${id}-${index + 1} leaves no headroom for the opus encoder (${peak.toFixed(2)})`);
    if (samples.length < 0.06 * SYNTH_SAMPLE_RATE) fail(`${id}-${index + 1} is shorter than an audible shot`);
  }
}

for (const [id, sound] of Object.entries(SOUND_REGISTRY)) {
  if (!["sfx", "ui"].includes(sound.category)) fail(`${id} has an invalid category`);
  if (!sound.urls?.length) fail(`${id} has no generated audio URL`);
  for (const url of sound.urls) {
    if (!url.endsWith(".ogg")) fail(`${id} must use OGG only`);
    const file = resolve(root, "public", url.replace(/^\//, ""));
    if (!existsSync(file)) fail(`${id} points to a missing file: ${url}`);
    const peak = inspectOpus(file);
    inspectEffectAudibility(id, sound, file, getDuration(file), peak);
  }
}

for (const [id, music] of Object.entries(MUSIC_REGISTRY)) {
  const file = resolve(root, "public", music.url.replace(/^\//, ""));
  if (!existsSync(file)) fail(`${id} points to a missing music file: ${music.url}`);
  inspectOpus(file);
  const duration = getDuration(file);
  if (!Number.isFinite(duration) || duration < 60 || duration > 120) {
    fail(`${id} must be 60–120 seconds, got ${duration}`);
  }
  inspectMusicAudibility(file);
}

console.log(`Audio check passed (${Object.keys(SOUND_REGISTRY).length} effects).`);
