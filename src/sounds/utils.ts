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
  ui_cancel: { category: "ui", gain: 0.26, urls: variantUrls("ui", "ui_cancel"), maxVoices: 3, playbackRate: [0.98, 1.02] },
  ui_purchase: { category: "ui", gain: 0.32, urls: ["/audio/sfx/ui/ui_purchase.ogg"], maxVoices: 2 },
  ui_error: { category: "ui", gain: 0.32, urls: variantUrls("ui", "ui_error"), maxVoices: 2, playbackRate: [0.98, 1.02] },
  ui_notification: { category: "ui", gain: 0.26, urls: ["/audio/sfx/ui/ui_notification.ogg"], maxVoices: 2 },
} as const satisfies Record<string, SoundDefinition>;

export type SoundId = keyof typeof SOUND_REGISTRY;
type UiSoundId = Extract<SoundId, `ui_${string}`>;

export const MUSIC_REGISTRY = {
  exploration: { url: "/audio/music/space-exploration.ogg" },
} as const;

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
    const context = new AudioContextConstructor();
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
    .catch(() => null);
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

export const startMusic = (id: MusicId = "exploration"): void => {
  if (!enabled || activeMusic?.id === id || requestedMusic === id) return;
  requestedMusic = id;
  const requestId = ++musicRequestId;
  void (async () => {
    const current = activeMusic;
    activeMusic = null;
    if (current) current.source.stop();
    const audio = getNodes();
    if (!audio) return;
    const buffer = await getBuffer(MUSIC_REGISTRY[id].url, audio.context);
    if (
      !buffer ||
      !enabled ||
      requestedMusic !== id ||
      musicRequestId !== requestId
    ) return;

    const source = audio.context.createBufferSource();
    const gain = audio.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.setValueAtTime(0, audio.context.currentTime);
    source.connect(gain);
    gain.connect(audio.music);
    activeMusic = { id, source, gain };
    source.onended = () => {
      if (activeMusic?.source === source) activeMusic = null;
    };
    source.start();
    gain.gain.linearRampToValueAtTime(1, audio.context.currentTime + MUSIC_FADE_SECONDS);
  })();
};

export const stopMusic = ({ fadeOut = true }: { fadeOut?: boolean } = {}): void => {
  requestedMusic = null;
  musicRequestId += 1;
  const current = activeMusic;
  activeMusic = null;
  if (!current) return;

  const duration = fadeOut ? MUSIC_FADE_SECONDS : 0;
  const { currentTime } = current.gain.context;
  current.gain.gain.cancelScheduledValues(currentTime);
  current.gain.gain.setValueAtTime(current.gain.gain.value, currentTime);
  current.gain.gain.linearRampToValueAtTime(0, currentTime + duration);
  current.source.stop(currentTime + duration + 0.03);
};
