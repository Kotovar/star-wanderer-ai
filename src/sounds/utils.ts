export type SoundType =
    | "click"
    | "success"
    | "error"
    | "combat"
    | "travel"
    | "levelUp"
    | "shop"
    | "artifact"
    | "damage"
    | "heal"
    | "shield"
    | "energy"
    | "alert"
    | "message"
    | "upgrade"
    | "destroy";

interface SoundConfig {
    pattern: number[]; // Frequencies in Hz
    duration: number; // Total duration in seconds
    waveType: OscillatorType;
    volume: number;
    delayBetweenNotes?: number; // Delay between notes in seconds
}

const soundConfigs: Record<SoundType, SoundConfig> = {
    click: {
        pattern: [800],
        duration: 0.05,
        waveType: "sine",
        volume: 0.15,
    },
    success: {
        pattern: [523.25, 659.25, 783.99, 1046.5], // C5 E5 G5 C6 arpeggio
        duration: 0.4,
        waveType: "sine",
        volume: 0.2,
        delayBetweenNotes: 0.08,
    },
    error: {
        pattern: [300, 250],
        duration: 0.3,
        waveType: "sawtooth",
        volume: 0.15,
        delayBetweenNotes: 0.12,
    },
    combat: {
        pattern: [400, 300, 200],
        duration: 0.4,
        waveType: "square",
        volume: 0.12,
        delayBetweenNotes: 0.1,
    },
    travel: {
        pattern: [440, 554.37, 659.25, 880], // A4 C#5 E5 A5 rising
        duration: 0.6,
        waveType: "sine",
        volume: 0.15,
        delayBetweenNotes: 0.12,
    },
    levelUp: {
        pattern: [523.25, 659.25, 783.99, 1046.5, 1318.51], // C major arpeggio up
        duration: 0.6,
        waveType: "triangle",
        volume: 0.25,
        delayBetweenNotes: 0.1,
    },
    shop: {
        pattern: [783.99, 987.77, 1174.66], // G5 B5 D6
        duration: 0.35,
        waveType: "sine",
        volume: 0.18,
        delayBetweenNotes: 0.09,
    },
    artifact: {
        pattern: [659.25, 783.99, 987.77, 1174.66, 1318.51], // E5 G5 B5 D6 E6 magical
        duration: 0.7,
        waveType: "sine",
        volume: 0.2,
        delayBetweenNotes: 0.12,
    },
    damage: {
        pattern: [200, 150],
        duration: 0.25,
        waveType: "sawtooth",
        volume: 0.15,
        delayBetweenNotes: 0.1,
    },
    heal: {
        pattern: [392, 523.25, 659.25], // G4 C5 E5 soothing
        duration: 0.4,
        waveType: "sine",
        volume: 0.18,
        delayBetweenNotes: 0.11,
    },
    shield: {
        pattern: [349.23, 466.16, 523.25], // F4 A#4 C5 protective
        duration: 0.35,
        waveType: "triangle",
        volume: 0.16,
        delayBetweenNotes: 0.1,
    },
    energy: {
        pattern: [440, 587.33, 739.99], // A4 D5 F#5
        duration: 0.35,
        waveType: "sine",
        volume: 0.16,
        delayBetweenNotes: 0.09,
    },
    alert: {
        pattern: [880, 880, 1174.66], // A5 A5 D6 urgent
        duration: 0.45,
        waveType: "square",
        volume: 0.18,
        delayBetweenNotes: 0.12,
    },
    message: {
        pattern: [659.25, 783.99], // E5 G5 gentle notification
        duration: 0.25,
        waveType: "sine",
        volume: 0.12,
        delayBetweenNotes: 0.1,
    },
    upgrade: {
        pattern: [523.25, 698.46, 880, 1046.5], // C5 F5 A5 C6 tech sound
        duration: 0.5,
        waveType: "triangle",
        volume: 0.2,
        delayBetweenNotes: 0.11,
    },
    destroy: {
        pattern: [300, 200, 100],
        duration: 0.5,
        waveType: "sawtooth",
        volume: 0.2,
        delayBetweenNotes: 0.13,
    },
};

// Audio context singleton
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    if (typeof window === "undefined") return null;

    if (!audioContext) {
        try {
            audioContext = new window.AudioContext();
        } catch {
            return null;
        }
    }

    if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {
            // Ignore resume errors
        });
    }

    return audioContext;
};

// Add slight random variation to frequency for natural feel
const varyFrequency = (freq: number, variance: number = 0.02): number => {
    const variation = 1 + (Math.random() * variance * 2 - variance);
    return freq * variation;
};

export const playSound = (type: SoundType, volumeMultiplier: number = 1) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const config = soundConfigs[type];
    if (!config) return;

    const baseVolume = config.volume * volumeMultiplier;
    const noteDuration =
        config.delayBetweenNotes || config.duration / config.pattern.length;

    config.pattern.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = varyFrequency(freq);
        osc.type = config.waveType;

        const startTime = ctx.currentTime + index * noteDuration;
        const noteLength = Math.min(noteDuration * 0.8, 0.15);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(baseVolume, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteLength);

        osc.start(startTime);
        osc.stop(startTime + noteLength + 0.02);
    });
};

// Utility function to play a custom sound
export const playCustomSound = (
    frequencies: number[],
    duration: number,
    waveType: OscillatorType = "sine",
    volume: number = 0.15,
) => {
    const ctx = getAudioContext();
    if (!ctx || frequencies.length === 0) return;

    const noteDuration = duration / frequencies.length;

    frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = freq;
        osc.type = waveType;

        const startTime = ctx.currentTime + index * noteDuration;
        const noteLength = noteDuration * 0.8;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteLength);

        osc.start(startTime);
        osc.stop(startTime + noteLength + 0.02);
    });
};
