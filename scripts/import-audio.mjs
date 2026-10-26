import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// Звуки и музыка сгенерированы в AI Studio (Stable Audio). Манифест хранит
// промпт, seed и asset id; скрипт превращает WAV из библиотеки студии в
// готовые OGG/Opus для public/audio.
const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(root, "public/audio");
const library = process.env.AI_STUDIO_LIBRARY ?? "/mnt/filestorage/ai-studio/library";
const manifest = JSON.parse(await readFile(resolve(root, "audio/source/ai-audio.json"), "utf8"));

const LOOP_CROSSFADE_SECONDS = 4;
// UI звучит чаще всего, поэтому тише боевых и мировых эффектов.
const SFX_PEAK_DB = -3.5;
const UI_PEAK_DB = -5;
const MUSIC_LUFS = -23;

const ffmpeg = async (args) => {
  const { stderr } = await run("ffmpeg", ["-hide_banner", "-y", ...args], { maxBuffer: 1 << 24 });
  return stderr;
};

const probeDuration = async (file) => {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file,
  ]);
  return Number(stdout.trim());
};

const peakDb = async (file) => {
  const log = await ffmpeg(["-i", file, "-af", "volumedetect", "-f", "null", "-"]);
  return Number(/max_volume:\s*(-?[\d.]+) dB/.exec(log)?.[1] ?? 0);
};

const encode = (input, output, filter, channels, bitrate) =>
  ffmpeg([
    "-i", input, "-af", filter, "-ac", String(channels), "-ar", "48000",
    "-c:a", "libopus", "-application", "audio", "-b:a", bitrate, "-vbr", "on", output,
  ]);

// Модель оставляет тишину по краям: срезаем её, затем короткие фейды и пик.
const importEffect = async (source, output, tempDir, peakTarget) => {
  const trimmed = resolve(tempDir, "trimmed.wav");
  const silence = "silenceremove=start_periods=1:start_threshold=-50dB";
  await ffmpeg(["-i", source, "-af", `${silence},areverse,${silence},areverse`, "-ac", "1", trimmed]);
  const duration = await probeDuration(trimmed);
  const gain = peakTarget - (await peakDb(trimmed));
  const fadeOut = Math.min(0.05, duration / 4);
  await encode(
    trimmed,
    output,
    `afade=t=in:d=0.004,afade=t=out:st=${(duration - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)},volume=${gain.toFixed(2)}dB,alimiter=limit=0.7:level=false`,
    1,
    "64k",
  );
};

// Петля: хвост трека кроссфейдом накладывается на начало, поэтому конец
// файла непрерывно переходит в его первый сэмпл.
const importMusic = async (source, output, tempDir) => {
  const length = await probeDuration(source);
  const fade = LOOP_CROSSFADE_SECONDS;
  const looped = resolve(tempDir, "looped.wav");
  await ffmpeg([
    "-i", source, "-filter_complex",
    [
      "[0]asplit=3[h][t][m]",
      `[h]atrim=0:${fade},asetpts=N/SR/TB,afade=t=in:d=${fade}:curve=qsin[hf]`,
      `[t]atrim=${(length - fade).toFixed(3)}:${length.toFixed(3)},asetpts=N/SR/TB,afade=t=out:d=${fade}:curve=qsin[tf]`,
      "[hf][tf]amix=inputs=2:normalize=0[x]",
      `[m]atrim=${fade}:${(length - fade).toFixed(3)},asetpts=N/SR/TB[mid]`,
      "[x][mid]concat=n=2:v=0:a=1[out]",
    ].join(";"),
    "-map", "[out]", looped,
  ]);
  const measured = JSON.parse(
    /\{[^{}]*"input_i"[^{}]*\}/.exec(
      await ffmpeg(["-i", looped, "-af", `loudnorm=I=${MUSIC_LUFS}:TP=-3:LRA=11:print_format=json`, "-f", "null", "-"]),
    )?.[0] ?? "{}",
  );
  await encode(
    looped,
    output,
    // LRA с запасом: иначе loudnorm уходит в динамический режим и меняет
    // громкость во времени, а на шве петли это слышно скачком.
    `loudnorm=I=${MUSIC_LUFS}:TP=-3:LRA=${Math.max(11, Math.ceil(Number(measured.input_lra)) + 1)}:linear=true:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh},alimiter=limit=0.7:level=false`,
    2,
    "96k",
  );
};

const tempDir = await mkdtemp(resolve(tmpdir(), "star-wanderer-audio-"));
try {
  for (const entry of manifest) {
    const output = resolve(outputRoot, entry.out);
    await mkdir(dirname(output), { recursive: true });
    const source = resolve(library, entry.source);
    await access(source).catch(() => {
      throw new Error(`${source} not found: set AI_STUDIO_LIBRARY to the AI Studio library directory`);
    });
    if (entry.kind === "music") await importMusic(source, output, tempDir);
    else await importEffect(source, output, tempDir, entry.out.startsWith("sfx/ui/") ? UI_PEAK_DB : SFX_PEAK_DB);
  }
  console.log(`Imported ${manifest.length} audio files into public/audio.`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
