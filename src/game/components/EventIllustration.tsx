"use client";

import { useId } from "react";

type EventIllustrationVariant = "storm" | "derelict" | "ruins";

interface EventIllustrationProps {
  variant: EventIllustrationVariant;
  accent?: string;
  muted?: boolean;
}

export function EventIllustration({
  variant,
  accent = "#00d4ff",
  muted = false,
}: EventIllustrationProps) {
  const uid = useId().replace(/:/g, "");
  const opacity = muted ? 0.42 : 1;

  return (
    <div
      className="relative overflow-hidden border bg-[rgba(0,0,0,0.28)]"
      style={{ borderColor: `${accent}55`, opacity }}
    >
      <svg
        viewBox="0 0 420 150"
        className="block h-[150px] w-full"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-fade`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
            <stop offset="50%" stopColor="#050810" stopOpacity="0.9" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.12" />
          </linearGradient>
        </defs>

        <rect width="420" height="150" fill={`url(#${uid}-fade)`} />
        <circle cx="210" cy="75" r="110" fill={`url(#${uid}-glow)`} />

        {variant === "storm" && <StormArt accent={accent} />}
        {variant === "derelict" && <DerelictArt accent={accent} />}
        {variant === "ruins" && <RuinsArt accent={accent} />}
      </svg>
    </div>
  );
}

function StormArt({ accent }: { accent: string }) {
  return (
    <g>
      {[0, 1, 2, 3].map((idx) => (
        <path
          key={idx}
          d={`M ${-20 + idx * 8} ${38 + idx * 22} C 85 ${5 + idx * 18}, 148 ${102 - idx * 12}, 240 ${55 + idx * 14} S 354 ${34 + idx * 18}, 442 ${75 + idx * 10}`}
          fill="none"
          stroke={accent}
          strokeWidth={idx === 1 ? 4 : 2}
          opacity={0.2 + idx * 0.12}
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;42;0"
            dur={`${5 + idx}s`}
            repeatCount="indefinite"
          />
        </path>
      ))}
      <path
        d="M218 18 L188 76 L216 72 L196 132 L254 56 L224 62 Z"
        fill={accent}
        opacity="0.78"
      >
        <animate attributeName="opacity" values="0.2;0.9;0.35;0.8;0.2" dur="2.6s" repeatCount="indefinite" />
      </path>
      {[56, 112, 300, 350].map((cx, idx) => (
        <circle key={cx} cx={cx} cy={42 + idx * 22} r={5 + idx} fill={accent} opacity="0.32">
          <animate attributeName="r" values={`${4 + idx};${12 + idx};${4 + idx}`} dur={`${2.2 + idx * 0.4}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0.05;0.35" dur={`${2.2 + idx * 0.4}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

function DerelictArt({ accent }: { accent: string }) {
  return (
    <g>
      <path
        d="M122 91 L186 52 L278 59 L330 82 L280 103 L184 101 Z"
        fill="rgba(5,8,16,0.85)"
        stroke={accent}
        strokeWidth="2"
      />
      <path d="M184 101 L220 70 L278 59" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.55" />
      <path d="M154 72 L100 55 L126 88" fill="rgba(5,8,16,0.8)" stroke={accent} strokeWidth="1.5" opacity="0.8" />
      <path d="M298 74 L350 54 L326 86" fill="rgba(5,8,16,0.8)" stroke={accent} strokeWidth="1.5" opacity="0.8" />
      <path d="M230 62 L214 88 L248 82 L238 105" fill="none" stroke="#ff6644" strokeWidth="2" opacity="0.75" />
      {[72, 94, 348, 370, 258, 142].map((cx, idx) => (
        <rect
          key={cx}
          x={cx}
          y={28 + (idx % 3) * 34}
          width={16 - (idx % 2) * 4}
          height="5"
          rx="1"
          fill={accent}
          opacity="0.35"
          transform={`rotate(${idx % 2 === 0 ? -22 : 31} ${cx} ${38 + (idx % 3) * 34})`}
        />
      ))}
      <circle cx="214" cy="76" r="38" fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 8" opacity="0.35">
        <animateTransform attributeName="transform" type="rotate" from="0 214 76" to="360 214 76" dur="18s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

function RuinsArt({ accent }: { accent: string }) {
  return (
    <g>
      <path d="M85 118 L338 118" stroke={accent} strokeWidth="2" opacity="0.55" />
      {[116, 160, 246, 292].map((x, idx) => (
        <path
          key={x}
          d={`M ${x} 118 L ${x + (idx % 2 === 0 ? 8 : -6)} 58 L ${x + 28} 58 L ${x + 30} 118 Z`}
          fill="rgba(5,8,16,0.78)"
          stroke={accent}
          strokeWidth="1.5"
          opacity={idx === 1 ? 0.62 : 0.9}
        />
      ))}
      <path d="M104 56 L216 28 L320 56 Z" fill="rgba(5,8,16,0.82)" stroke={accent} strokeWidth="2" />
      <path d="M210 42 L198 84 L224 78 L208 112" fill="none" stroke="#ffb000" strokeWidth="2" opacity="0.8" />
      {[130, 206, 282].map((cx, idx) => (
        <circle key={cx} cx={cx} cy={92} r={3 + idx} fill={accent} opacity="0.45">
          <animate attributeName="opacity" values="0.45;0.08;0.45" dur={`${2.4 + idx * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}
