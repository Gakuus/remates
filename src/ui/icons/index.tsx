import type { SVGProps } from "react";

/**
 * Iconografía consistente: set de línea único, 24px, trazo 1.5
 * (docs/PLAN.md §9). Sin dependencias externas.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconHouse = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.8V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.8" />
    <path d="M10 21v-6h4v6" />
  </Svg>
);

export const IconWater = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3s6 6.1 6 10.2A6 6 0 0 1 6 13.2C6 9.1 12 3 12 3Z" />
  </Svg>
);

export const IconRoute = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 21 7 3" />
    <path d="M17 21l3-18" />
    <path d="M12 4v2M12 10v2M12 16v2" />
  </Svg>
);

export const IconForest = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 7 11h3l-4 6h6" />
    <path d="M12 3l5 8h-3l4 6h-6" />
    <path d="M12 17v4" />
  </Svg>
);

export const IconBarn = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10 12 5l9 5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" />
    <path d="M8 21v-7h8v7" />
  </Svg>
);

export const IconPower = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);

export const IconPhotos = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 16 4.5-4.5a2 2 0 0 1 2.8 0L15 16" />
    <circle cx="15.5" cy="9.5" r="1.5" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h16" />
    <path d="m14 6 6 6-6 6" />
  </Svg>
);

export const IconSliders = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Svg>
);

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconArea = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4h7v7H4zM13 13h7v7h-7z" />
    <path d="M13 4h7v7h-7zM4 13h7v7H4z" opacity={0.35} />
  </Svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const IconGavel = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14 4 6 6-8.5 8.5-6-6L14 4Z" />
    <path d="m8.5 9.5 6 6" />
    <path d="M3 21h8" />
  </Svg>
);

export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3h8l10 10-8 8L3 11V3Z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </Svg>
);

export const IconWrench = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 6.5a4 4 0 0 0-5.4 4.8L3 17.4 6.6 21l6.1-6.1a4 4 0 0 0 4.8-5.4l-3 3-2.8.2-.2-2.8 3-3Z" />
  </Svg>
);

export const IconTruck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 6h12v10H2zM14 10h4l4 3v3h-8z" />
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="19" r="2" />
  </Svg>
);

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </Svg>
);

export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Svg>
);
