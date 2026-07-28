import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { sfxr } from "jsfxr";
import { renderExplorationLoop } from "../audio/source/music/space-exploration.mjs";
import { SFX_PRESETS } from "../audio/source/sfx/presets.mjs";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(root, "public/audio");

const writeStereoWav = async (file, left, right, sampleRate) => {
  const frames = left.length;
  const dataSize = frames * 4;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 4, 28);
  wav.writeUInt16LE(4, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < frames; index += 1) {
    const offset = 44 + index * 4;
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[index])) * 32_767), offset);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[index])) * 32_767), offset + 2);
  }
  await writeFile(file, wav);
};

const wavData = (dataUri) => Buffer.from(dataUri.slice(dataUri.indexOf(",") + 1), "base64");

const encode = async (input, output, filter, bitrate) => {
  await mkdir(dirname(output), { recursive: true });
  await run("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    input,
    "-af",
    filter,
    "-c:a",
    "libopus",
    "-application",
    "audio",
    "-b:a",
    bitrate,
    "-vbr",
    "on",
    output,
  ]);
};

const generateSfx = async (tempDir) => {
  for (const [id, definition] of Object.entries(SFX_PRESETS)) {
    for (const [index, preset] of definition.presets.entries()) {
      const wave = sfxr.toWave(preset);
      if (wave.clipping > 0) {
        throw new Error(`${id}-${index + 1} clipped during jsfxr rendering (${wave.clipping})`);
      }

      const duration = wave.buffer.length / wave.header.sampleRate;
      const fadeOutStart = Math.max(0.01, duration - 0.025).toFixed(3);
      const wav = resolve(tempDir, `${id}-${index + 1}.wav`);
      const name = definition.presets.length === 1 ? id : `${id}-${index + 1}`;
      await writeFile(wav, wavData(wave.dataURI));
      await encode(
        wav,
        resolve(outputRoot, "sfx", definition.directory, `${name}.ogg`),
        `afade=t=in:st=0:d=0.006,afade=t=out:st=${fadeOutStart}:d=0.025,alimiter=limit=0.79:level=false`,
        "48k",
      );
    }
  }
};

const generateMusic = async (tempDir) => {
  const { left, right, sampleRate } = renderExplorationLoop();
  const wav = resolve(tempDir, "space-exploration.wav");
  await writeStereoWav(wav, left, right, sampleRate);
  await encode(
    wav,
    resolve(outputRoot, "music/space-exploration.ogg"),
    "loudnorm=I=-26:TP=-2:LRA=7,alimiter=limit=0.79:level=false",
    "80k",
  );
};

const tempDir = await mkdtemp(resolve(root, ".tmp-audio-"));
try {
  await generateMusic(tempDir);
  await generateSfx(tempDir);
  console.log(`Generated ${Object.keys(SFX_PRESETS).length} sound definitions in public/audio.`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
