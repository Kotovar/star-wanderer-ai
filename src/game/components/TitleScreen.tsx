"use client";

import { useTranslation } from "@/lib/useTranslation";

export function TitleScreen() {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-[#050810] flex flex-col items-center justify-center overflow-hidden">
      {/* Starfield background */}
      <div className="absolute inset-0">
        {Array.from({ length: 80 }).map((_, i) => {
          const top = `${(i * 37 + 13) % 100}%`;
          const left = `${(i * 53 + 7) % 100}%`;
          const size = (i % 3) + 1;
          const opacity = 0.2 + (i % 5) * 0.15;
          const animDelay = `${(i * 0.7) % 5}s`;
          const animDuration = `${2 + (i % 4)}s`;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                top,
                left,
                width: size,
                height: size,
                opacity,
                animation: `twinkle ${animDuration} ease-in-out ${animDelay} infinite`,
              }}
            />
          );
        })}
      </div>

      {/* Nebula glow */}
      <div
        className="absolute rounded-full"
        style={{
          top: "10%",
          left: "20%",
          width: 300,
          height: 300,
          background:
            "radial-gradient(circle, rgba(0,100,255,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          bottom: "15%",
          right: "15%",
          width: 250,
          height: 250,
          background:
            "radial-gradient(circle, rgba(255,0,100,0.06) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Title */}
      <div className="relative z-10 text-center px-4">
        <p
          className="font-['Orbitron'] text-sm sm:text-base tracking-[0.3em] text-[#ffb000] mt-2"
          style={{
            textShadow: "0 0 10px rgba(255,176,0,0.4)",
          }}
        >
          {t("title_screen.subtitle")}
        </p>

        {/* Decorative line */}
        <div className="mt-6 mx-auto w-48 h-px bg-linear-to-r from-transparent via-[#00ff41] to-transparent opacity-40" />

        {/* Flavor text */}
        <p className="mt-6 text-[#556] text-xs sm:text-sm font-['Share_Tech_Mono'] max-w-md mx-auto leading-relaxed">
          {t("title_screen.flavor")}
        </p>
      </div>

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0,255,65,0.03) 0px, transparent 1px, transparent 2px, rgba(0,255,65,0.03) 3px)",
          animation: "scanlines 8s linear infinite",
        }}
      />

      <style jsx>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.2; }
                    50% { opacity: 0.8; }
                }
                @keyframes scanlines {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(10px); }
                }
                @keyframes glow-pulse {
                    0%, 100% {
                        text-shadow: 0 0 20px rgba(0,255,65,0.6), 0 0 40px rgba(0,255,65,0.3);
                    }
                    50% {
                        text-shadow: 0 0 30px rgba(0,255,65,0.8), 0 0 60px rgba(0,255,65,0.4), 0 0 100px rgba(0,255,65,0.2);
                    }
                }
            `}</style>
    </div>
  );
}
