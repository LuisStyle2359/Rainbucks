import type { JSX, SVGProps } from "react";
import type { GameId } from "@/lib/casino/games";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const RocketIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9A2.2 2.2 0 0 0 5 15Z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2Z" />
    <path d="M9 12H4s.5-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.5 4-2c1.1-1.6 0-5 0-5" />
  </svg>
);

export const GemIconLine = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 3h12l4 6-10 12L2 9Z" />
    <path d="M11 3 8 9l4 12 4-12-3-6M2 9h20" />
  </svg>
);

export const TargetIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3 17 9 11l4 4 8-8" />
    <path d="M14 7h7v7" />
  </svg>
);

export const PlinkoIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="4" r="1.2" fill="currentColor" />
    <circle cx="8.5" cy="9" r="1.2" fill="currentColor" />
    <circle cx="15.5" cy="9" r="1.2" fill="currentColor" />
    <circle cx="5" cy="14" r="1.2" fill="currentColor" />
    <circle cx="12" cy="14" r="1.2" fill="currentColor" />
    <circle cx="19" cy="14" r="1.2" fill="currentColor" />
    <path d="M3 19h18" />
  </svg>
);

export const HomeIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />
  </svg>
);

export const ShieldIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const UserIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

export const ChatIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
  </svg>
);

export const SoundOnIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M11 5 6 9H3v6h3l5 4Z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

export const SoundOffIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M11 5 6 9H3v6h3l5 4Z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </svg>
);

export const CloseIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const SendIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

export const LogoutIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export const GAME_ICONS: Record<GameId, (props: IconProps) => JSX.Element> = {
  crash: RocketIcon,
  mines: GemIconLine,
  limbo: TargetIcon,
  plinko: PlinkoIcon,
};
