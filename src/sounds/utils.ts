export const DEFAULT_AUDIO_VOLUMES = {
  master: 0.8,
  music: 0.45,
  sfx: 0.7,
  ui: 0.45,
} as const;

export type AudioVolumeCategory = keyof typeof DEFAULT_AUDIO_VOLUMES;
type EffectCategory = "sfx" | "ui";

interface SoundDefinition {
  category: EffectCategory;
  gain: number;
  urls: readonly string[];
  maxVoices?: number;
  playbackRate?: readonly [number, number];
}

const variantUrls = (directory: string, id: string) => [
  `/audio/sfx/${directory}/${id}-1.ogg`,
  `/audio/sfx/${directory}/${id}-2.ogg`,
  `/audio/sfx/${directory}/${id}-3.ogg`,
] as const;

export const SOUND_REGISTRY = {
  combat_kinetic: { category: "sfx", gain: 0.58, urls: variantUrls("combat", "combat_kinetic"), maxVoices: 6, playbackRate: [0.97, 1.03] },
  combat_laser: { category: "sfx", gain: 0.54, urls: variantUrls("combat", "combat_laser"), maxVoices: 6, playbackRate: [0.97, 1.03] },
  combat_missile: { category: "sfx", gain: 0.62, urls: ["/audio/sfx/combat/combat_missile.ogg"], maxVoices: 4 },
  combat_plasma: { category: "sfx", gain: 0.6, urls: ["/audio/sfx/combat/combat_plasma.ogg"], maxVoices: 4 },
  combat_drones: { category: "sfx", gain: 0.48, urls: ["/audio/sfx/combat/combat_drones.ogg"], maxVoices: 4 },
  combat_antimatter: { category: "sfx", gain: 0.68, urls: ["/audio/sfx/combat/combat_antimatter.ogg"], maxVoices: 3 },
  combat_quantum_torpedo: { category: "sfx", gain: 0.7, urls: ["/audio/sfx/combat/combat_quantum_torpedo.ogg"], maxVoices: 3 },
  combat_ion_cannon: { category: "sfx", gain: 0.65, urls: ["/audio/sfx/combat/combat_ion_cannon.ogg"], maxVoices: 3 },
  combat_enemy_fire: { category: "sfx", gain: 0.58, urls: variantUrls("combat", "combat_enemy_fire"), maxVoices: 5, playbackRate: [0.97, 1.03] },
  combat_shield_hit: { category: "sfx", gain: 0.62, urls: ["/audio/sfx/combat/combat_shield_hit.ogg"], maxVoices: 5 },
  combat_hull_hit: { category: "sfx", gain: 0.68, urls: ["/audio/sfx/combat/combat_hull_hit.ogg"], maxVoices: 5 },
  combat_shield_break: { category: "sfx", gain: 0.78, urls: ["/audio/sfx/combat/combat_shield_break.ogg"], maxVoices: 2 },
  combat_miss: { category: "sfx", gain: 0.44, urls: ["/audio/sfx/combat/combat_miss.ogg"], maxVoices: 3 },
  combat_critical: { category: "sfx", gain: 0.72, urls: ["/audio/sfx/combat/combat_critical.ogg"], maxVoices: 2 },
  combat_target_select: { category: "sfx", gain: 0.28, urls: ["/audio/sfx/combat/combat_target_select.ogg"], maxVoices: 2 },
  combat_enemy_destroyed: { category: "sfx", gain: 0.84, urls: ["/audio/sfx/combat/combat_enemy_destroyed.ogg"], maxVoices: 2 },
  combat_player_destroyed: { category: "sfx", gain: 0.9, urls: ["/audio/sfx/combat/combat_player_destroyed.ogg"], maxVoices: 1 },
  combat_no_active_weapons: { category: "sfx", gain: 0.38, urls: ["/audio/sfx/combat/combat_no_active_weapons.ogg"], maxVoices: 1 },
  travel_departure: { category: "sfx", gain: 0.52, urls: ["/audio/sfx/world/travel_departure.ogg"], maxVoices: 2 },
  travel_arrival: { category: "sfx", gain: 0.48, urls: ["/audio/sfx/world/travel_arrival.ogg"], maxVoices: 2 },
  world_danger: { category: "sfx", gain: 0.8, urls: ["/audio/sfx/world/world_danger.ogg"], maxVoices: 2 },
  world_discovery: { category: "sfx", gain: 0.52, urls: ["/audio/sfx/world/world_discovery.ogg"], maxVoices: 2 },
  world_mining: { category: "sfx", gain: 0.48, urls: ["/audio/sfx/world/world_mining.ogg"], maxVoices: 4, playbackRate: [0.98, 1.02] },
  world_artifact: { category: "sfx", gain: 0.72, urls: ["/audio/sfx/world/world_artifact.ogg"], maxVoices: 1 },
  world_repair: { category: "sfx", gain: 0.48, urls: ["/audio/sfx/world/world_repair.ogg"], maxVoices: 2 },
  world_heal: { category: "sfx", gain: 0.46, urls: ["/audio/sfx/world/world_heal.ogg"], maxVoices: 2 },
  world_refuel: { category: "sfx", gain: 0.46, urls: ["/audio/sfx/world/world_refuel.ogg"], maxVoices: 2 },
  world_install: { category: "sfx", gain: 0.5, urls: ["/audio/sfx/world/world_install.ogg"], maxVoices: 2 },
  world_scrap: { category: "sfx", gain: 0.54, urls: ["/audio/sfx/world/world_scrap.ogg"], maxVoices: 2 },
  world_upgrade: { category: "sfx", gain: 0.52, urls: ["/audio/sfx/world/world_upgrade.ogg"], maxVoices: 2 },
  world_research: { category: "sfx", gain: 0.54, urls: ["/audio/sfx/world/world_research.ogg"], maxVoices: 2 },
  world_contract: { category: "sfx", gain: 0.5, urls: ["/audio/sfx/world/world_contract.ogg"], maxVoices: 2 },
  world_crew_milestone: { category: "sfx", gain: 0.54, urls: ["/audio/sfx/world/world_crew_milestone.ogg"], maxVoices: 2 },
  ui_dialog_open: { category: "ui", gain: 0.34, urls: ["/audio/sfx/ui/ui_dialog_open.ogg"], maxVoices: 2 },
  ui_dialog_close: { category: "ui", gain: 0.3, urls: ["/audio/sfx/ui/ui_dialog_close.ogg"], maxVoices: 2 },
  ui_tab: { category: "ui", gain: 0.22, urls: ["/audio/sfx/ui/ui_tab.ogg"], maxVoices: 2 },
  ui_confirm: { category: "ui", gain: 0.3, urls: variantUrls("ui", "ui_confirm"), maxVoices: 3, playbackRate: [0.98, 1.02] },
  ui_cancel: { category: "ui", gain: 0.3, urls: variantUrls("ui", "ui_cancel"), maxVoices: 3, playbackRate: [0.98, 1.02] },
  ui_purchase: { category: "ui", gain: 0.32, urls: ["/audio/sfx/ui/ui_purchase.ogg"], maxVoices: 2 },
  ui_error: { category: "ui", gain: 0.65, urls: variantUrls("ui", "ui_error"), maxVoices: 2, playbackRate: [0.98, 1.02] },
  ui_notification: { category: "ui", gain: 0.26, urls: ["/audio/sfx/ui/ui_notification.ogg"], maxVoices: 2 },
} as const satisfies Record<string, SoundDefinition>;

export type SoundId = keyof typeof SOUND_REGISTRY;
type UiSoundId = Extract<SoundId, `ui_${string}`>;

const musicUrls = (name: string, count: number) =>
  Array.from({ length: count }, (_, index) =>
    `/audio/music/space-${name}${index === 0 ? "" : `-${index + 1}`}.ogg`);

// Несколько треков на контекст: при входе выбирается случайный, а после
// полного проигрыша играющий трек кроссфейдом сменяется другим.
export const MUSIC_REGISTRY = {
  title: { urls: musicUrls("title", 2) },
  exploration: { urls: musicUrls("exploration", 3) },
  combat: { urls: musicUrls("combat", 3) },
  boss: { urls: musicUrls("boss", 3) },
  expedition: { urls: musicUrls("expedition", 2) },
  dive: { urls: musicUrls("dive", 2) },
  storm: { urls: musicUrls("storm", 2) },
  station: { urls: musicUrls("station", 2) },
  crisis: { urls: musicUrls("crisis", 2) },
  // Станции и планеты звучат по расе владельцев; станции без расы
  // (дипломатические) остаются на общем station.
  station_human: { urls: musicUrls("station-human", 1) },
  station_synthetic: { urls: musicUrls("station-synthetic", 1) },
  station_xenosymbiont: { urls: musicUrls("station-xenosymbiont", 1) },
  station_krylorian: { urls: musicUrls("station-krylorian", 1) },
  station_voidborn: { urls: musicUrls("station-voidborn", 1) },
  station_crystalline: { urls: musicUrls("station-crystalline", 1) },
  planet_human: { urls: musicUrls("planet-human", 1) },
  planet_synthetic: { urls: musicUrls("planet-synthetic", 1) },
  planet_xenosymbiont: { urls: musicUrls("planet-xenosymbiont", 1) },
  planet_krylorian: { urls: musicUrls("planet-krylorian", 1) },
  planet_voidborn: { urls: musicUrls("planet-voidborn", 1) },
  planet_crystalline: { urls: musicUrls("planet-crystalline", 1) },
  planet_empty: { urls: musicUrls("planet-empty", 2) },
} as const satisfies Record<string, { urls: readonly string[] }>;

type MusicId = keyof typeof MUSIC_REGISTRY;
type AudioVolumes = Record<AudioVolumeCategory, number>;

interface AudioNodes {
  context: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  ui: GainNode;
}

interface ActiveMusic {
  id: MusicId;
  url: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

const MUSIC_FADE_SECONDS = 1.5;
const MAX_EFFECT_VOICES = 18;
let nodes: AudioNodes | null = null;
let enabled = true;
let volumes: AudioVolumes = { ...DEFAULT_AUDIO_VOLUMES };
let requestedMusic: MusicId | null = null;
let musicRequestId = 0;
let activeMusic: ActiveMusic | null = null;
let fadingMusic: ActiveMusic | null = null;
let activeEffectVoices = 0;
const voicesBySound = new Map<SoundId, number>();
const bufferCache = new Map<string, Promise<AudioBuffer | null>>();

const clampVolume = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

const setGain = (gain: GainNode, value: number) => {
  const { currentTime } = gain.context;
  gain.gain.cancelScheduledValues(currentTime);
  gain.gain.setTargetAtTime(value, currentTime, 0.015);
};

const fadeOutMusic = (music: ActiveMusic, duration: number): void => {
  const { currentTime } = music.gain.context;
  music.gain.gain.cancelScheduledValues(currentTime);
  music.gain.gain.setValueAtTime(music.gain.gain.value, currentTime);
  music.gain.gain.linearRampToValueAtTime(0, currentTime + duration);
  music.source.stop(currentTime + duration + 0.03);
};

const stopFadingMusic = (): void => {
  const music = fadingMusic;
  fadingMusic = null;
  if (music) music.source.stop(music.gain.context.currentTime);
};

const syncBusVolumes = () => {
  if (!nodes) return;
  setGain(nodes.master, enabled ? volumes.master : 0);
  setGain(nodes.music, volumes.music);
  setGain(nodes.sfx, volumes.sfx);
  setGain(nodes.ui, volumes.ui);
};

const getNodes = (): AudioNodes | null => {
  if (typeof window === "undefined") return null;
  if (nodes) return nodes;

  try {
    const AudioContextConstructor = window.AudioContext;
    // При горячей перезагрузке модуля в dev старый контекст продолжал бы играть
    // свою музыку параллельно новой: закрываем его.
    const audioGlobal = globalThis as { __starWandererAudioContext?: AudioContext };
    void audioGlobal.__starWandererAudioContext?.close().catch(() => undefined);
    const context = new AudioContextConstructor();
    audioGlobal.__starWandererAudioContext = context;
    const master = context.createGain();
    const music = context.createGain();
    const sfx = context.createGain();
    const ui = context.createGain();
    music.connect(master);
    sfx.connect(master);
    ui.connect(master);
    master.connect(context.destination);
    nodes = { context, master, music, sfx, ui };
    syncBusVolumes();
    return nodes;
  } catch {
    return null;
  }
};

const getBuffer = (url: string, context: AudioContext) => {
  const cached = bufferCache.get(url);
  if (cached) return cached;

  const request = fetch(url)
    .then((response) => (response.ok ? response.arrayBuffer() : null))
    .then((data) => (data ? context.decodeAudioData(data) : null))
    .catch(() => null)
    .then((buffer) => {
      // Сбой не кэшируем: иначе временная ошибка сети навсегда глушит трек.
      if (!buffer) bufferCache.delete(url);
      return buffer;
    });
  bufferCache.set(url, request);
  return request;
};

const chooseUrl = (urls: readonly string[]) => urls[Math.floor(Math.random() * urls.length)] ?? null;

const releaseVoice = (id: SoundId) => {
  activeEffectVoices = Math.max(0, activeEffectVoices - 1);
  const remaining = (voicesBySound.get(id) ?? 1) - 1;
  if (remaining > 0) voicesBySound.set(id, remaining);
  else voicesBySound.delete(id);
};

const playEffect = async (id: SoundId) => {
  if (!enabled || activeEffectVoices >= MAX_EFFECT_VOICES) return;
  const definition: SoundDefinition = SOUND_REGISTRY[id];
  const voiceLimit = definition.maxVoices ?? 3;
  if ((voicesBySound.get(id) ?? 0) >= voiceLimit) return;

  const audio = getNodes();
  const url = chooseUrl(definition.urls);
  if (!audio || !url) return;
  const buffer = await getBuffer(url, audio.context);
  if (
    !buffer ||
    !enabled ||
    activeEffectVoices >= MAX_EFFECT_VOICES ||
    (voicesBySound.get(id) ?? 0) >= voiceLimit
  ) return;

  const source = audio.context.createBufferSource();
  const gain = audio.context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = definition.playbackRate
    ? definition.playbackRate[0] + Math.random() * (definition.playbackRate[1] - definition.playbackRate[0])
    : 1;
  gain.gain.value = definition.gain;
  source.connect(gain);
  gain.connect(definition.category === "ui" ? audio.ui : audio.sfx);
  activeEffectVoices += 1;
  voicesBySound.set(id, (voicesBySound.get(id) ?? 0) + 1);
  source.onended = () => releaseVoice(id);
  source.start();
};

export const unlockAudio = async (): Promise<void> => {
  const audio = getNodes();
  if (!audio || audio.context.state !== "suspended") return;
  try {
    await audio.context.resume();
  } catch {
    // Browsers may still reject non-gesture calls; the next allowed gesture retries it.
  }
};

export const setSoundPlaybackEnabled = (value: boolean): void => {
  enabled = value;
  syncBusVolumes();
  if (value) void unlockAudio();
};

export const setAudioVolumes = (next: AudioVolumes): void => {
  volumes = {
    master: clampVolume(next.master),
    music: clampVolume(next.music),
    sfx: clampVolume(next.sfx),
    ui: clampVolume(next.ui),
  };
  syncBusVolumes();
};

export const setAudioVolume = (category: AudioVolumeCategory, value: number): void => {
  setAudioVolumes({ ...volumes, [category]: value });
};

export const playSound = (id: SoundId): void => {
  void playEffect(id);
};

export const playUi = (id: UiSoundId): void => {
  playSound(id);
};

const playMusicTrack = async (id: MusicId, requestId: number, previousUrl?: string) => {
  const audio = getNodes();
  const { urls } = MUSIC_REGISTRY[id];
  const url = chooseUrl(urls.length > 1 ? urls.filter((candidate) => candidate !== previousUrl) : urls);
  if (!audio || !url) return;
  const buffer = await getBuffer(url, audio.context);
  if (
    !buffer ||
    !enabled ||
    requestedMusic !== id ||
    musicRequestId !== requestId
  ) return;

  stopFadingMusic();
  const source = audio.context.createBufferSource();
  const gain = audio.context.createGain();
  source.buffer = buffer;
  source.loop = true;
  gain.gain.setValueAtTime(0, audio.context.currentTime);
  source.connect(gain);
  gain.connect(audio.music);
  const outgoing = activeMusic;
  activeMusic = { id, url, source, gain };
  source.onended = () => {
    if (activeMusic?.source === source) activeMusic = null;
    if (fadingMusic?.source === source) fadingMusic = null;
  };
  source.start();
  const startedAt = audio.context.currentTime;
  gain.gain.linearRampToValueAtTime(1, startedAt + MUSIC_FADE_SECONDS);
  if (outgoing) {
    fadingMusic = outgoing;
    fadeOutMusic(outgoing, MUSIC_FADE_SECONDS);
  }

  if (urls.length < 2 || !Number.isFinite(buffer.duration)) return;
  // Часы контекста стоят, пока он suspended (до первого жеста), поэтому
  // остаток считается по ним, а не по setTimeout.
  const rotateAt = buffer.duration - MUSIC_FADE_SECONDS;
  const scheduleRotation = () => {
    const remaining = rotateAt - (audio.context.currentTime - startedAt);
    setTimeout(() => {
      if (activeMusic?.source !== source || requestedMusic !== id) return;
      if (audio.context.currentTime - startedAt < rotateAt) {
        scheduleRotation();
        return;
      }
      // Сорвавшаяся смена (ошибка загрузки, mute) не должна навсегда
      // оставить один трек: пока он играет, пробуем снова.
      void playMusicTrack(id, ++musicRequestId, url).then(() => {
        if (activeMusic?.source === source) setTimeout(scheduleRotation, 30_000);
      });
    }, Math.max(1000, remaining * 1000));
  };
  scheduleRotation();
};

export const startMusic = (id: MusicId = "exploration"): void => {
  if (!enabled) return;
  if (activeMusic?.id === id) {
    // Отменяем только ожидающий запрос другого контекста, а не смену трека
    // текущего: иначе ротация молча обрывается.
    if (requestedMusic !== id) {
      requestedMusic = id;
      musicRequestId += 1;
    }
    return;
  }
  if (requestedMusic === id) return;
  requestedMusic = id;
  void playMusicTrack(id, ++musicRequestId);
};

export const stopMusic = ({ fadeOut = true }: { fadeOut?: boolean } = {}): void => {
  requestedMusic = null;
  musicRequestId += 1;
  const fading = fadingMusic;
  fadingMusic = null;
  const current = activeMusic;
  activeMusic = null;
  const duration = fadeOut ? MUSIC_FADE_SECONDS : 0;
  if (fading) fadeOutMusic(fading, duration);
  if (current) fadeOutMusic(current, duration);
};
