/**
 * Выстрелы, попадания и взрывы синтезируются здесь, а не в jsfxr: один
 * осциллятор с одной огибающей звучит как писк из восьмибитной игры, а удар —
 * это всегда несколько слоёв (транзиент, тело со свипом частоты, шумовой
 * хвост). Рендер детерминированный: тот же вход даёт тот же файл на любой
 * машине.
 */

const SAMPLE_RATE = 44_100;
const TAU = Math.PI * 2;

const frames = (seconds) => Math.max(1, Math.round(seconds * SAMPLE_RATE));

/** Детерминированный шум вместо Math.random: сборка обязана повторяться. */
const noiseSource = (seed) => {
  let state = (seed * 2_654_435_761) >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return (state / 2_147_483_648) - 1;
  };
};

/**
 * Фильтр Чемберлина: единственный вид фильтра, у которого частоту среза можно
 * гнать по свипу от сэмпла к сэмплу — без этого «пиу» и электрическая дуга не
 * получаются в принципе.
 */
const makeFilter = (resonance) => {
  const damping = Math.max(0.06, 2 - resonance * 1.9);
  let low = 0;
  let band = 0;
  return (sample, cutoffHz, mode) => {
    const cutoff = Math.min(Math.max(cutoffHz, 20), SAMPLE_RATE * 0.22);
    const f = 2 * Math.sin((Math.PI * cutoff) / SAMPLE_RATE);
    const high = sample - low - damping * band;
    band += f * high;
    low += f * band;
    if (mode === "hp") return high;
    if (mode === "bp") return band;
    return low;
  };
};

const shapeValue = (shape, phase, noise) => {
  if (shape === "noise") return noise();
  if (shape === "saw") return 2 * (phase - Math.floor(phase + 0.5));
  if (shape === "square") return phase - Math.floor(phase) < 0.5 ? 1 : -1;
  return Math.sin(TAU * phase);
};

const sweep = (from, to, progress, curve) => from + (to - from) * progress ** curve;

/**
 * Один слой выстрела: свип частоты, своя огибающая и свой фильтр. Слои
 * складываются в общий буфер — из них и собирается тембр оружия.
 */
function addLayer(buffer, {
  at = 0,
  duration,
  shape = "sine",
  freq = [440, 440],
  freqCurve = 2,
  level = 0.5,
  attack = 0.004,
  curve = 2.4,
  filter,
  fm,
  gate,
  seed = 1,
}) {
  const start = frames(at);
  const length = frames(duration);
  const noise = noiseSource(seed);
  const filterState = filter ? makeFilter(filter.resonance ?? 0.6) : null;
  let phase = 0;

  for (let index = 0; index < length; index += 1) {
    const target = start + index;
    if (target >= buffer.length) break;
    const progress = index / length;
    const time = index / SAMPLE_RATE;

    const frequency = sweep(freq[0], freq[1], progress, freqCurve);
    phase += frequency / SAMPLE_RATE;
    const modulation = fm ? Math.sin(TAU * fm.hz * time) * fm.depth : 0;
    let value = shapeValue(shape, phase + modulation, noise);

    if (filterState) {
      value = filterState(
        value,
        sweep(filter.freq[0], filter.freq[1], progress, filter.curve ?? 2),
        filter.mode ?? "lp",
      );
    }

    const envelope = progress < attack
      ? progress / attack
      : (1 - (progress - attack) / (1 - attack)) ** curve;
    const gateGain = gate
      ? (Math.sin(TAU * gate.hz * time) > gate.bias ? 1 : gate.floor ?? 0)
      : 1;

    buffer[target] += value * level * envelope * gateGain;
  }
}

/** Мягкое насыщение + нормализация: пик задаёт относительную громкость оружия. */
function finish(buffer, peak, drive = 1.35) {
  let loudest = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    const value = Math.tanh(buffer[index] * drive);
    buffer[index] = value;
    loudest = Math.max(loudest, Math.abs(value));
  }
  if (loudest > 0) {
    const scale = peak / loudest;
    for (let index = 0; index < buffer.length; index += 1) buffer[index] *= scale;
  }
  return buffer;
}

const render = (duration, peak, build, drive) => {
  const buffer = new Float32Array(frames(duration));
  build(buffer);
  return finish(buffer, peak, drive);
};

/** Лазер: короткий яркий разряд с падающей частотой, без «чирпа» вверх. */
const laser = (pitch) => render(0.26, 0.42, (buffer) => {
  addLayer(buffer, {
    duration: 0.028, shape: "noise", level: 0.4, curve: 3.2, seed: 11,
    filter: { mode: "hp", freq: [6200 * pitch, 2400 * pitch], resonance: 0.5 },
  });
  addLayer(buffer, {
    duration: 0.16, shape: "saw", freq: [2050 * pitch, 360 * pitch], freqCurve: 0.42,
    level: 0.62, curve: 2.6, filter: { mode: "lp", freq: [5400 * pitch, 780 * pitch], resonance: 1.35 },
  });
  addLayer(buffer, {
    duration: 0.1, shape: "sine", freq: [240 * pitch, 88], level: 0.3, curve: 2.2,
  });
  addLayer(buffer, {
    at: 0.02, duration: 0.2, shape: "noise", level: 0.09, curve: 2.8, seed: 27,
    filter: { mode: "bp", freq: [1800 * pitch, 700], resonance: 0.9 },
  });
});

/** Кинетика: щелчок затвора, низкий удар и металлический призвук. */
const kinetic = (pitch) => render(0.24, 0.44, (buffer) => {
  addLayer(buffer, {
    duration: 0.014, shape: "noise", level: 0.85, curve: 2.4, seed: 5,
    filter: { mode: "hp", freq: [8200, 3200], resonance: 0.4 },
  });
  addLayer(buffer, {
    duration: 0.13, shape: "sine", freq: [190 * pitch, 44], freqCurve: 0.5,
    level: 0.85, curve: 2.8,
  });
  addLayer(buffer, {
    at: 0.006, duration: 0.06, shape: "square", freq: [940 * pitch, 620 * pitch],
    level: 0.22, curve: 3.4, filter: { mode: "bp", freq: [2600, 1500], resonance: 1.1 },
  });
  addLayer(buffer, {
    at: 0.01, duration: 0.18, shape: "noise", level: 0.16, curve: 2.6, seed: 41,
    filter: { mode: "bp", freq: [3200, 900], resonance: 0.7 },
  });
});

/** Ракета: хлопок пусковой трубы и разгоняющийся выхлоп. */
const missile = () => render(0.5, 0.45, (buffer) => {
  addLayer(buffer, {
    duration: 0.02, shape: "noise", level: 0.7, curve: 2.6, seed: 7,
    filter: { mode: "hp", freq: [5200, 2200], resonance: 0.5 },
  });
  addLayer(buffer, {
    duration: 0.42, shape: "noise", level: 0.55, curve: 1.5, attack: 0.06, seed: 19,
    filter: { mode: "bp", freq: [700, 3600], curve: 1.4, resonance: 0.55 },
  });
  addLayer(buffer, {
    duration: 0.4, shape: "sine", freq: [96, 58], level: 0.5, curve: 1.8, attack: 0.02,
  });
  addLayer(buffer, {
    at: 0.03, duration: 0.3, shape: "saw", freq: [300, 130], level: 0.16, curve: 2,
    filter: { mode: "lp", freq: [1800, 500], resonance: 0.5 },
  });
});

/** Плазма: короткий заряд и вязкий разряд с шипением. */
const plasma = () => render(0.4, 0.42, (buffer) => {
  addLayer(buffer, {
    duration: 0.06, shape: "sine", freq: [380, 940], level: 0.28, curve: 0.6, attack: 0.2,
  });
  addLayer(buffer, {
    at: 0.05, duration: 0.3, shape: "saw", freq: [780 * 1.01, 190], freqCurve: 0.5,
    level: 0.62, curve: 2.2, filter: { mode: "lp", freq: [4400, 560], resonance: 1.5 },
  });
  addLayer(buffer, {
    at: 0.05, duration: 0.3, shape: "saw", freq: [742, 178], freqCurve: 0.5,
    level: 0.34, curve: 2.2, filter: { mode: "lp", freq: [3600, 480], resonance: 1.3 },
  });
  addLayer(buffer, {
    at: 0.05, duration: 0.32, shape: "noise", level: 0.22, curve: 2, seed: 23,
    filter: { mode: "bp", freq: [2800, 850], resonance: 0.8 },
  });
  addLayer(buffer, {
    at: 0.05, duration: 0.26, shape: "sine", freq: [130, 52], level: 0.42, curve: 2.4,
  });
});

/** Дроны: очередь коротких импульсов роя поверх жужжания. */
const drones = () => render(0.42, 0.4, (buffer) => {
  for (let index = 0; index < 5; index += 1) {
    addLayer(buffer, {
      at: 0.012 + index * 0.055, duration: 0.045, shape: "square",
      freq: [(1650 + index * 120), (1150 + index * 90)], level: 0.34 - index * 0.03,
      curve: 3, filter: { mode: "bp", freq: [2500, 1600], resonance: 1.2 },
    });
  }
  addLayer(buffer, {
    duration: 0.34, shape: "square", freq: [330, 280], level: 0.2, curve: 1.6, attack: 0.05,
    fm: { hz: 46, depth: 0.55 }, filter: { mode: "lp", freq: [2400, 1100], resonance: 0.7 },
  });
  addLayer(buffer, {
    duration: 0.3, shape: "noise", level: 0.1, curve: 2, seed: 33,
    filter: { mode: "bp", freq: [4200, 2400], resonance: 0.6 },
  });
});

/** Антиматерия: набор заряда, провал в суб-бас и раскат. */
const antimatter = () => render(0.68, 0.48, (buffer) => {
  addLayer(buffer, {
    duration: 0.12, shape: "sine", freq: [190, 1450], level: 0.32, curve: 0.5, attack: 0.3,
    fm: { hz: 24, depth: 0.35 },
  });
  addLayer(buffer, {
    at: 0.1, duration: 0.55, shape: "sine", freq: [150, 36], freqCurve: 0.45,
    level: 0.9, curve: 1.7,
  });
  addLayer(buffer, {
    at: 0.1, duration: 0.5, shape: "noise", level: 0.45, curve: 1.9, attack: 0.01, seed: 51,
    filter: { mode: "lp", freq: [5200, 420], resonance: 0.75 },
  });
  addLayer(buffer, {
    at: 0.1, duration: 0.3, shape: "sine", freq: [2350, 880], level: 0.14, curve: 2.4,
  });
});

/** Квантовая торпеда: биение двух тонов и фазовые провалы. */
const quantumTorpedo = () => render(0.56, 0.44, (buffer) => {
  addLayer(buffer, {
    duration: 0.03, shape: "noise", level: 0.4, curve: 2.8, seed: 61,
    filter: { mode: "hp", freq: [4200, 1800], resonance: 0.6 },
  });
  for (const [detune, level] of [[1, 0.42], [1.014, 0.34]]) {
    addLayer(buffer, {
      duration: 0.46, shape: "sine", freq: [540 * detune, 205 * detune], freqCurve: 0.6,
      level, curve: 1.9, attack: 0.01, gate: { hz: 27, bias: -0.35, floor: 0.25 },
    });
  }
  addLayer(buffer, {
    duration: 0.44, shape: "sine", freq: [92, 58], level: 0.42, curve: 1.8,
  });
  addLayer(buffer, {
    at: 0.02, duration: 0.4, shape: "noise", level: 0.13, curve: 2.1, seed: 73,
    filter: { mode: "bp", freq: [5200, 1500], resonance: 0.85 },
  });
});

/** Ионная пушка: электрическая дуга — рваный треск поверх грязного гула. */
const ionCannon = () => render(0.42, 0.42, (buffer) => {
  addLayer(buffer, {
    duration: 0.34, shape: "noise", level: 0.5, curve: 1.8, seed: 83,
    gate: { hz: 63, bias: -0.15, floor: 0.12 },
    filter: { mode: "bp", freq: [3400, 1400], resonance: 1.1 },
  });
  addLayer(buffer, {
    duration: 0.32, shape: "square", freq: [150, 118], level: 0.42, curve: 1.9, attack: 0.01,
    fm: { hz: 88, depth: 0.9 }, filter: { mode: "lp", freq: [3000, 900], resonance: 0.9 },
  });
  addLayer(buffer, {
    duration: 0.12, shape: "saw", freq: [880, 280], level: 0.4, curve: 2.6,
    filter: { mode: "bp", freq: [2600, 900], resonance: 1.3 },
  });
  addLayer(buffer, {
    at: 0.04, duration: 0.3, shape: "sine", freq: [225, 190], level: 0.12, curve: 1.6, attack: 0.08,
  });
});

/** Орудие врага: чужой импульс — тот же язык, но другой тембр и строй. */
const enemyFire = (pitch) => render(0.24, 0.41, (buffer) => {
  addLayer(buffer, {
    duration: 0.016, shape: "noise", level: 0.42, curve: 2.6, seed: 97,
    filter: { mode: "hp", freq: [4600 * pitch, 2000], resonance: 0.5 },
  });
  addLayer(buffer, {
    duration: 0.15, shape: "square", freq: [1180 * pitch, 260 * pitch], freqCurve: 0.5,
    level: 0.5, curve: 2.4, fm: { hz: 140, depth: 0.12 },
    filter: { mode: "bp", freq: [2100 * pitch, 620], resonance: 1.25 },
  });
  addLayer(buffer, {
    duration: 0.12, shape: "sine", freq: [130 * pitch, 54], level: 0.4, curve: 2.5,
  });
});

/** Попадание в корпус: удар металла — щелчок, низкий толчок и звон обшивки. */
const hullHit = () => render(0.34, 0.46, (buffer) => {
  addLayer(buffer, {
    duration: 0.012, shape: "noise", level: 0.9, curve: 2.2, seed: 101,
    filter: { mode: "hp", freq: [9000, 3500], resonance: 0.45 },
  });
  addLayer(buffer, {
    duration: 0.17, shape: "sine", freq: [165, 46], freqCurve: 0.5, level: 0.85, curve: 2.6,
  });
  addLayer(buffer, {
    at: 0.004, duration: 0.24, shape: "square", freq: [1240, 1170], level: 0.14, curve: 2.6,
    filter: { mode: "bp", freq: [1400, 1150], resonance: 1.45 },
  });
  addLayer(buffer, {
    at: 0.006, duration: 0.19, shape: "square", freq: [835, 790], level: 0.11, curve: 2.8,
    filter: { mode: "bp", freq: [950, 800], resonance: 1.5 },
  });
  addLayer(buffer, {
    at: 0.01, duration: 0.3, shape: "noise", level: 0.14, curve: 2.2, seed: 113,
    filter: { mode: "bp", freq: [3600, 1200], resonance: 0.7 },
  });
});

/** Попадание в щит: не удар, а всплеск энергии — тон уходит вверх. */
const shieldHit = () => render(0.38, 0.44, (buffer) => {
  addLayer(buffer, {
    duration: 0.2, shape: "sine", freq: [860, 1480], freqCurve: 0.5, level: 0.5, curve: 2.4,
    fm: { hz: 92, depth: 0.16 },
  });
  addLayer(buffer, {
    duration: 0.32, shape: "noise", level: 0.2, curve: 2, seed: 127,
    filter: { mode: "bp", freq: [5200, 2400], resonance: 0.95 },
  });
  addLayer(buffer, {
    duration: 0.26, shape: "sine", freq: [310, 215], level: 0.3, curve: 2.2,
  });
  addLayer(buffer, {
    at: 0.004, duration: 0.05, shape: "noise", level: 0.3, curve: 2.6, seed: 139,
    filter: { mode: "hp", freq: [6800, 3400], resonance: 0.5 },
  });
});

/** Пробой щита: трещина, осыпающиеся осколки поля и провал вниз. */
const shieldBreak = () => render(0.62, 0.32, (buffer) => {
  addLayer(buffer, {
    duration: 0.06, shape: "noise", level: 0.8, curve: 2.4, seed: 131,
    filter: { mode: "hp", freq: [7200, 2600], resonance: 0.55 },
  });
  addLayer(buffer, {
    at: 0.02, duration: 0.46, shape: "noise", level: 0.4, curve: 1.8, seed: 137,
    gate: { hz: 39, bias: -0.2, floor: 0.06 },
    filter: { mode: "bp", freq: [4400, 1300], resonance: 1.05 },
  });
  addLayer(buffer, {
    duration: 0.5, shape: "sine", freq: [640, 72], freqCurve: 0.4, level: 0.55, curve: 1.9,
  });
  addLayer(buffer, {
    at: 0.03, duration: 0.42, shape: "sine", freq: [125, 34], level: 0.5, curve: 1.8,
  });
});

/** Крит: короткий яркий акцент поверх попадания, не второй взрыв. */
const critical = () => render(0.34, 0.46, (buffer) => {
  addLayer(buffer, {
    duration: 0.01, shape: "noise", level: 0.9, curve: 2.2, seed: 149,
    filter: { mode: "hp", freq: [9400, 4200], resonance: 0.45 },
  });
  addLayer(buffer, {
    duration: 0.11, shape: "square", freq: [1620, 1160], level: 0.36, curve: 3,
    filter: { mode: "bp", freq: [2400, 1400], resonance: 1.5 },
  });
  addLayer(buffer, {
    at: 0.05, duration: 0.24, shape: "sine", freq: [920, 2150], freqCurve: 0.55,
    level: 0.34, curve: 2.6,
  });
  addLayer(buffer, {
    duration: 0.13, shape: "sine", freq: [185, 58], level: 0.5, curve: 2.6,
  });
});

/** Промах: снаряд прошёл мимо — только воздух, без удара. */
const miss = () => render(0.32, 0.34, (buffer) => {
  addLayer(buffer, {
    duration: 0.3, shape: "noise", level: 0.6, attack: 0.14, curve: 1.7, seed: 151,
    filter: { mode: "bp", freq: [2700, 680], resonance: 0.8 },
  });
  addLayer(buffer, {
    at: 0.02, duration: 0.22, shape: "noise", level: 0.18, attack: 0.2, curve: 1.8, seed: 157,
    filter: { mode: "hp", freq: [4200, 1900], resonance: 0.5 },
  });
});

/** Гибель врага: раскат с осколками, а не длинный шум. */
const enemyDestroyed = () => render(0.88, 0.44, (buffer) => {
  addLayer(buffer, {
    duration: 0.03, shape: "noise", level: 0.8, curve: 2.4, seed: 163,
    filter: { mode: "hp", freq: [6200, 2100], resonance: 0.5 },
  });
  addLayer(buffer, {
    duration: 0.72, shape: "noise", level: 0.7, curve: 1.6, attack: 0.008, seed: 167,
    filter: { mode: "lp", freq: [4400, 260], resonance: 0.7 },
  });
  addLayer(buffer, {
    duration: 0.66, shape: "sine", freq: [135, 32], freqCurve: 0.5, level: 0.85, curve: 1.7,
  });
  addLayer(buffer, {
    at: 0.06, duration: 0.78, shape: "noise", level: 0.22, curve: 1.7, seed: 173,
    gate: { hz: 22, bias: -0.3, floor: 0.12 },
    filter: { mode: "bp", freq: [3400, 1100], resonance: 0.95 },
  });
  addLayer(buffer, {
    at: 0.02, duration: 0.26, shape: "square", freq: [430, 300], level: 0.12, curve: 2.4,
    filter: { mode: "bp", freq: [1400, 700], resonance: 1.3 },
  });
});

/** Гибель игрока: то же событие, но ниже, дольше и со скрежетом корпуса. */
const playerDestroyed = () => render(1, 0.46, (buffer) => {
  addLayer(buffer, {
    duration: 0.04, shape: "noise", level: 0.7, curve: 2.2, seed: 179,
    filter: { mode: "hp", freq: [5200, 1800], resonance: 0.5 },
  });
  addLayer(buffer, {
    duration: 0.92, shape: "sine", freq: [105, 26], freqCurve: 0.5, level: 0.9, curve: 1.5,
  });
  addLayer(buffer, {
    duration: 0.86, shape: "noise", level: 0.65, curve: 1.4, attack: 0.01, seed: 181,
    filter: { mode: "lp", freq: [3400, 180], resonance: 0.7 },
  });
  addLayer(buffer, {
    at: 0.08, duration: 0.8, shape: "saw", freq: [185, 68], level: 0.3, curve: 1.5,
    fm: { hz: 7.5, depth: 0.45 }, filter: { mode: "lp", freq: [1100, 320], resonance: 0.9 },
  });
  addLayer(buffer, {
    at: 0.1, duration: 0.86, shape: "noise", level: 0.2, curve: 1.6, seed: 191,
    gate: { hz: 17, bias: -0.35, floor: 0.1 },
    filter: { mode: "bp", freq: [2600, 900], resonance: 0.95 },
  });
});

/**
 * Слоёные звуки боя. Три варианта там же, где они были у пресетов: залп из
 * одинаковых сэмплов слышно как один растянутый щелчок.
 */
export const SYNTH_SOUNDS = {
  combat_laser: { directory: "combat", variants: [1, 0.92, 1.09].map((pitch) => () => laser(pitch)) },
  combat_kinetic: { directory: "combat", variants: [1, 0.94, 1.07].map((pitch) => () => kinetic(pitch)) },
  combat_enemy_fire: { directory: "combat", variants: [1, 0.9, 1.12].map((pitch) => () => enemyFire(pitch)) },
  combat_missile: { directory: "combat", variants: [missile] },
  combat_plasma: { directory: "combat", variants: [plasma] },
  combat_drones: { directory: "combat", variants: [drones] },
  combat_antimatter: { directory: "combat", variants: [antimatter] },
  combat_quantum_torpedo: { directory: "combat", variants: [quantumTorpedo] },
  combat_ion_cannon: { directory: "combat", variants: [ionCannon] },
  combat_hull_hit: { directory: "combat", variants: [hullHit] },
  combat_shield_hit: { directory: "combat", variants: [shieldHit] },
  combat_shield_break: { directory: "combat", variants: [shieldBreak] },
  combat_critical: { directory: "combat", variants: [critical] },
  combat_miss: { directory: "combat", variants: [miss] },
  combat_enemy_destroyed: { directory: "combat", variants: [enemyDestroyed] },
  combat_player_destroyed: { directory: "combat", variants: [playerDestroyed] },
};

export const SYNTH_SAMPLE_RATE = SAMPLE_RATE;
