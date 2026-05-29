"use client";

export function LegendIcon({ type }: { type: string }) {
  switch (type) {
    case "unknown_ship":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <defs>
            <radialGradient id="lg-unknown-ship" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#aab3c4" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#aab3c4" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="12" cy="12" r="11" fill="url(#lg-unknown-ship)" />
          <polygon
            points="12,2.8 7.2,8.8 4.2,16.2 8.9,15.1 12,18.8 15.1,15.1 19.8,16.2 16.8,8.8"
            fill="#2f3642" stroke="#9aa4b5" strokeWidth="1.2"
          />
          <polygon
            points="12,6.4 9.3,11.7 14.7,11.7"
            fill="#1a1f28"
          />
          <line x1="8.8" y1="14.8" x2="15.2" y2="14.8" stroke="#6d7787" strokeWidth="1" />
          <circle cx="9.7" cy="15.9" r="1.1" fill="#788291" />
          <circle cx="14.3" cy="15.9" r="1.1" fill="#788291" />
        </svg>
      );
    case "unknown_object":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <defs>
            <radialGradient id="lg-unknown-object" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#b184ff" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#b184ff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="12" cy="12" r="10.5" fill="url(#lg-unknown-object)" />
          <polygon
            points="12,2.8 19.2,7 19.2,17 12,21.2 4.8,17 4.8,7"
            fill="#15131d" stroke="#8f7ab8" strokeWidth="1.2"
          />
          <polygon
            points="12,5.6 16.8,8.3 16.8,15.7 12,18.4 7.2,15.7 7.2,8.3"
            fill="none" stroke="#5f4d7d" strokeWidth="1"
          />
          <circle cx="12" cy="12" r="2.1" fill="#d9ccff" opacity="0.9" />
          <circle cx="16.8" cy="8.1" r="1" fill="#a48de3" />
          <circle cx="7.3" cy="15.9" r="1" fill="#a48de3" />
        </svg>
      );
    case "planet":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#1e90ff" opacity="0.15" />
          <circle cx="12" cy="12" r="7" fill="#1a6ec0" />
          <circle cx="9.5" cy="9.5" r="2.5" fill="#87ceeb" opacity="0.55" />
          <circle cx="14.5" cy="14" r="1.5" fill="#0d4a8a" opacity="0.6" />
        </svg>
      );
    case "station":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10.5" fill="#5ab8d4" opacity="0.12" />
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="#2d6d82" strokeWidth="1.2" opacity="0.75" />
          <polygon points="12,5.4 17.4,8.6 17.4,15.4 12,18.6 6.6,15.4 6.6,8.6" fill="#1c3540" stroke="#5ab8d4" strokeWidth="1.2" />
          <line x1="12" y1="5.4" x2="12" y2="2.6" stroke="#244b59" strokeWidth="2" />
          <line x1="17.4" y1="15.4" x2="20" y2="17.1" stroke="#244b59" strokeWidth="2" />
          <line x1="6.6" y1="15.4" x2="4" y2="17.1" stroke="#244b59" strokeWidth="2" />
          <circle cx="12" cy="2.6" r="1.3" fill="#0c1820" stroke="#00ff88" strokeWidth="0.9" />
          <circle cx="20" cy="17.1" r="1.3" fill="#0c1820" stroke="#00ff88" strokeWidth="0.9" />
          <circle cx="4" cy="17.1" r="1.3" fill="#0c1820" stroke="#00ff88" strokeWidth="0.9" />
          <circle cx="12" cy="12" r="2.2" fill="#8fe2ff" />
        </svg>
      );
    case "enemy_ship":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill="#ff0040" opacity="0.15" />
          <polygon
            points="12,1.5 5,8.5 2.2,17.6 7.8,19 12,15.5 16.2,19 21.8,17.6 19,8.5"
            fill="#8b0000" stroke="#ff4444" strokeWidth="1.5"
          />
          <circle cx="6.4" cy="10.6" r="1.4" fill="#ff6600" />
          <circle cx="17.6" cy="10.6" r="1.4" fill="#ff6600" />
          <circle cx="5" cy="16.2" r="1.4" fill="#ff6600" />
          <circle cx="19" cy="16.2" r="1.4" fill="#ff6600" />
          <circle cx="12" cy="6.4" r="2.1" fill="#ff4444" />
          <polygon points="9.2,17.6 12,22.5 14.8,17.6" fill="#ff4400" />
        </svg>
      );
    case "friendly_ship":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill="#00b4ff" opacity="0.18" />
          <polygon
            points="12,0 2,20 12,16 22,20"
            fill="#2a6a8a" stroke="#4a9aba" strokeWidth="1.5"
          />
          <circle cx="12" cy="8" r="2.5" fill="#7fc8dc" />
          <circle cx="12" cy="18" r="2" fill="#4a9aba" />
        </svg>
      );
    case "asteroid_belt":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#cd853f" opacity="0.18" />
          <polygon points="14,3 16.5,4 15.5,6.5 13,5.5" fill="#cd853f" />
          <polygon points="3.5,9.5 6,8.5 7,11 4.5,11.5" fill="#a0522d" />
          <polygon points="17.5,13.5 21,12.5 21,15.5 18,15.5" fill="#8b7355" />
          <polygon points="8,17.5 10.5,16.5 11,19.5 8.5,20" fill="#cd853f" />
          <polygon points="3,6 5,5 5.5,7.5 3.5,7.5" fill="#a0522d" />
          <circle cx="12" cy="12" r="2.5" fill="#8b7355" />
          <circle cx="9" cy="9" r="1.2" fill="#7a6040" />
        </svg>
      );
    case "anomaly":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9.5" fill="#ffee00" opacity="0.12" stroke="#ffee00" strokeWidth="1.5" />
          <text x="12" y="17" textAnchor="middle" fill="#ffee00" fontSize="13" fontFamily="monospace" fontWeight="bold">?</text>
        </svg>
      );
    case "cosmic_storm":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#00d4ff" opacity="0.18" />
          <circle cx="12" cy="12" r="7" fill="#00d4ff" opacity="0.1" />
          <circle cx="12" cy="12" r="4" fill="#00d4ff" opacity="0.1" />
          {/* lightning bolt */}
          <polygon points="15,2 9,13 13,13 8,22 14,11 10,11" fill="#00d4ff" />
        </svg>
      );
    case "distress_signal":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10.5" fill="none" stroke="#ffaa00" strokeWidth="1" opacity="0.4" />
          <circle cx="12" cy="12" r="7.5" fill="#ffaa00" opacity="0.12" />
          <polygon points="12,5 19,12 12,19 5,12" fill="#ffaa00" opacity="0.75" stroke="#ffaa00" strokeWidth="1" />
          <line x1="12" y1="8" x2="12" y2="16" stroke="#050810" strokeWidth="1.5" opacity="0.5" />
          <line x1="8" y1="12" x2="16" y2="12" stroke="#050810" strokeWidth="1.5" opacity="0.5" />
        </svg>
      );
    case "derelict_ship":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="#3a4a5a" opacity="0.22" />
          {/* debris */}
          <rect x="17" y="4" width="2" height="2" fill="#3a4a5a" opacity="0.9" />
          <rect x="5" y="16" width="2" height="2" fill="#3a4a5a" opacity="0.9" />
          <rect x="16.5" y="17.5" width="1.5" height="2" fill="#3a4a5a" opacity="0.9" />
          {/* tilted hull */}
          <g transform="rotate(22, 12, 12)">
            <polygon
              points="12,2.2 4.3,16.9 9.2,14.1 12,18.3 14.8,14.1 18.3,16.9"
              fill="#1e2d3d" stroke="#4a5f72" strokeWidth="1.5"
            />
            <polygon points="12,7.1 9.9,12.7 14.1,12.7" fill="#111827" />
            <line x1="9.9" y1="10.6" x2="14.1" y2="14.8" stroke="#ff2200" strokeWidth="1" opacity="0.8" />
          </g>
        </svg>
      );
    case "gas_giant":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <defs>
            <radialGradient id="lg-gas" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#cc88ff" />
              <stop offset="50%" stopColor="#7b4fff" />
              <stop offset="100%" stopColor="#050810" />
            </radialGradient>
            <clipPath id="lg-gas-clip">
              <circle cx="12" cy="12" r="9" />
            </clipPath>
          </defs>
          <circle cx="12" cy="12" r="9" fill="url(#lg-gas)" />
          <rect x="3" y="7.5" width="18" height="2.5" fill="#7b4fff" opacity="0.5" clipPath="url(#lg-gas-clip)" />
          <rect x="3" y="13.5" width="18" height="2" fill="#7b4fff" opacity="0.5" clipPath="url(#lg-gas-clip)" />
          <circle cx="12" cy="12" r="9" fill="none" stroke="#cc88ff" strokeWidth="1" opacity="0.6" />
          <circle cx="19" cy="5" r="2" fill="white" opacity="0.65" />
        </svg>
      );
    case "wreck_field":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#8b7355" opacity="0.15" />
          {/* debris fragments (tier 1, scaled 0.75) */}
          <g transform="translate(7.5,9) rotate(-22)"><rect x="-3.4" y="-1.1" width="6.75" height="2.25" fill="#8b7355" /></g>
          <g transform="translate(15.75,7.5) rotate(40)"><rect x="-2.25" y="-0.75" width="4.5" height="1.5" fill="#a0785a" /></g>
          <g transform="translate(10.5,15.75) rotate(15)"><rect x="-2.6" y="-0.75" width="5.25" height="1.5" fill="#8b7355" /></g>
          <g transform="translate(16.5,15) rotate(-55)"><rect x="-1.9" y="-0.75" width="3.75" height="1.5" fill="#a0785a" /></g>
          <g transform="translate(6.75,14.25) rotate(30)"><rect x="-1.9" y="-0.75" width="3.75" height="1.5" fill="#8b7355" /></g>
          <circle cx="12" cy="12" r="2" fill="#7a6040" opacity="0.7" />
        </svg>
      );
    case "boss":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <defs>
            <radialGradient id="lg-boss" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff00ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ff00ff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="12" cy="12" r="11" fill="url(#lg-boss)" />
          {/* hexagonal frame */}
          <polygon points="18.93,8 18.93,16 12,20 5.07,16 5.07,8 12,4" fill="none" stroke="#ff00ff" strokeWidth="1.5" />
          {/* inner core */}
          <polygon points="16,9.5 16,14.5 12,17 8,14.5 8,9.5 12,7" fill="#3a0a3a" stroke="#cc00cc" strokeWidth="1" />
          {/* skull-like eye slots */}
          <circle cx="9.5" cy="11" r="1.5" fill="#ff00ff" opacity="0.9" />
          <circle cx="14.5" cy="11" r="1.5" fill="#ff00ff" opacity="0.9" />
          <rect x="9" y="14" width="6" height="1" rx="0.5" fill="#cc00cc" opacity="0.7" />
        </svg>
      );
    default:
      return null;
  }
}
