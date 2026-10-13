import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "highlight";

const tones: Record<Tone, string> = {
  neutral: "bg-monte-950/70 text-crema-50",
  accent: "bg-salvia-100 text-monte",
  highlight: "bg-oliva text-crema-50",
};

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

/** Etiqueta compacta: tipo de campo, estado, cantidad de fotos. */
export function Badge({ children, tone = "neutral", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
