type Sounds = "click" | "success" | "error" | "combat" | "travel";

export const playSound = (type: Sounds) => {
    if (typeof window === "undefined") return;

    const freqMap: Record<Sounds, number> = {
        click: 800,
        success: 1200,
        error: 400,
        combat: 600,
        travel: 1000,
    };

    const freq = freqMap[type] || 800;

    try {
        const ctx = new window.AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "square";
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    } catch {
        // Audio not available
    }
};
