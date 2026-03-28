"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslation } from "@/lib/useTranslation";

const TUTORIAL_KEY = "sw_tutorial_done_v1";

// useSyncExternalStore correctly handles SSR/hydration:
// server and initial hydration use getServerSnapshot (false = hidden),
// then the client switches to getSnapshot without triggering a hydration error.
const subscribe = () => () => {};
const getSnapshot = () => !localStorage.getItem(TUTORIAL_KEY);
const getServerSnapshot = () => false;

export function WelcomeTutorial() {
    const shouldShow = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const [dismissed, setDismissed] = useState(false);
    const [step, setStep] = useState(0);
    const { t } = useTranslation();

    const dismiss = () => {
        localStorage.setItem(TUTORIAL_KEY, "1");
        setDismissed(true);
    };

    if (!shouldShow || dismissed) return null;

    const steps = [
        {
            icon: "🚀",
            title: t("tutorial.step1_title"),
            desc: t("tutorial.step1_desc"),
            highlight: t("tutorial.step1_highlight"),
        },
        {
            icon: "🗺️",
            title: t("tutorial.step2_title"),
            desc: t("tutorial.step2_desc"),
            highlight: t("tutorial.step2_highlight"),
        },
        {
            icon: "🏪",
            title: t("tutorial.step3_title"),
            desc: t("tutorial.step3_desc"),
            highlight: t("tutorial.step3_highlight"),
        },
        {
            icon: "👥",
            title: t("tutorial.step4_title"),
            desc: t("tutorial.step4_desc"),
            highlight: "",
        },
        {
            icon: "⚗️",
            title: t("tutorial.step5_title"),
            desc: t("tutorial.step5_desc"),
            highlight: t("tutorial.step5_highlight"),
        },
    ];

    const current = steps[step];
    const isLast = step === steps.length - 1;

    return (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.88)] z-60 flex items-center justify-center p-4">
            <div
                className="bg-[#080d18] border-2 border-[#00d4ff] max-w-md w-full font-['Share_Tech_Mono']"
                style={{
                    boxShadow:
                        "0 0 40px rgba(0,212,255,0.2), 0 0 80px rgba(0,212,255,0.08)",
                }}
            >
                {/* Header */}
                <div className="px-5 py-3 border-b border-[#00d4ff] flex justify-between items-center bg-[rgba(0,212,255,0.04)]">
                    <h2 className="font-['Orbitron'] text-sm font-bold text-[#00d4ff] tracking-widest uppercase">
                        {t("tutorial.title")}
                    </h2>
                    <span className="text-[#334] text-xs">
                        {step + 1} / {steps.length}
                    </span>
                </div>

                {/* Step content */}
                <div className="px-6 pt-6 pb-4 text-center min-h-55 flex flex-col items-center justify-center">
                    <div
                        className="text-5xl mb-4 select-none"
                        style={{
                            filter: "drop-shadow(0 0 12px rgba(255,176,0,0.4))",
                        }}
                    >
                        {current.icon}
                    </div>
                    <h3 className="font-['Orbitron'] text-[#ffb000] text-sm font-bold mb-3 tracking-wide uppercase">
                        {current.title}
                    </h3>
                    <p className="text-[#99a] text-sm leading-relaxed mb-4 max-w-sm">
                        {current.desc}
                    </p>
                    {current.highlight && (
                        <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] px-3 py-2 text-[#00ff41] text-xs w-full max-w-sm text-left">
                            💡 {current.highlight}
                        </div>
                    )}
                </div>

                {/* Progress dots */}
                <div className="flex gap-2 justify-center pb-4">
                    {steps.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setStep(i)}
                            className={`rounded-full transition-all cursor-pointer ${
                                i === step
                                    ? "w-6 h-2 bg-[#00d4ff]"
                                    : i < step
                                      ? "w-2 h-2 bg-[#00ff41]"
                                      : "w-2 h-2 bg-[#223]"
                            }`}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-[#112] flex justify-between items-center">
                    <button
                        onClick={dismiss}
                        className="text-[#445] hover:text-[#778] text-xs cursor-pointer transition-colors px-2 py-1 uppercase tracking-wider"
                    >
                        {t("tutorial.skip")}
                    </button>
                    <div className="flex gap-2">
                        {step > 0 && (
                            <button
                                onClick={() => setStep((s) => s - 1)}
                                className="px-3 py-2 border border-[#334] text-[#556] hover:border-[#00d4ff] hover:text-[#00d4ff] text-sm cursor-pointer transition-colors font-['Orbitron']"
                            >
                                ←
                            </button>
                        )}
                        {!isLast ? (
                            <button
                                onClick={() => setStep((s) => s + 1)}
                                className="px-5 py-2 bg-[rgba(0,212,255,0.12)] border border-[#00d4ff] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.22)] text-xs cursor-pointer transition-all font-['Orbitron'] tracking-widest uppercase"
                            >
                                {t("tutorial.next")} →
                            </button>
                        ) : (
                            <button
                                onClick={dismiss}
                                className="px-5 py-2 bg-[#00ff41] text-[#050810] hover:bg-[#00ee38] text-xs cursor-pointer transition-all font-['Orbitron'] font-bold tracking-widest uppercase"
                                style={{
                                    boxShadow: "0 0 14px rgba(0,255,65,0.4)",
                                }}
                            >
                                {t("tutorial.start")} ▶
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
