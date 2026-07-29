import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registryUrl = pathToFileURL(resolve(root, "src/sounds/utils.ts")).href;
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

for (const id of requiredVariantIds) {
  const urls = SOUND_REGISTRY[id]?.urls;
  if (!urls || urls.length !== 3) fail(`${id} must expose exactly three variants`);
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
