"use client";

import { useTranslation } from "@/lib/useTranslation";

export function TitleScreen() {
  const { t } = useTranslation();

  return (
    <div className="title-screen fixed inset-0 bg-[#050810] flex flex-col items-center justify-center overflow-hidden">
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
              className="title-star absolute rounded-full bg-white"
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

      <div className="title-radar absolute left-1/2 top-1/2" aria-hidden="true" />

      {/* Title */}
      <div className="relative z-10 text-center px-4">
        <h1 className="title-wordmark font-['Orbitron'] font-black uppercase leading-none tracking-[0.08em] text-[#00ff41]">
          {t("title_screen.title")}
        </h1>
        <p
          className="font-['Orbitron'] text-xs sm:text-base tracking-[0.3em] text-[#ffb000] mt-4"
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
        className="cockpit-scanlines absolute inset-0 pointer-events-none opacity-30"
      />
    </div>
  );
}
