"use client"

import { cn } from "@/lib/utils"
import { useLevelVariable } from "@/features/chat/hooks/use-audio-level"

/** Gain de chaque barre : une silhouette de voix plutôt qu'un bloc uniforme. */
const BAR_GAINS = [0.55, 0.85, 1, 0.75, 0.5]

interface LiveLevelBarsProps {
  /** Volume lu à chaque image (sans rendu React) ; absent : barres au repos. */
  getLevel?: () => number
  className?: string
}

/**
 * Barres qui suivent le volume réel d'une voix en direct. Elles prennent la
 * couleur du texte (`currentColor`) et la hauteur du parent (`h-*`).
 */
export function LiveLevelBars({ getLevel, className }: LiveLevelBarsProps) {
  const ref = useLevelVariable<HTMLSpanElement>(getLevel)

  return (
    <span ref={ref} aria-hidden className={cn("flex h-4 items-center gap-0.75", className)}>
      {BAR_GAINS.map((gain, index) => (
        <span
          key={index}
          className="w-0.75 rounded-full bg-current transition-[height] duration-75 ease-linear"
          style={{ height: `calc(20% + var(--level, 0) * ${gain * 80}%)` }}
        />
      ))}
    </span>
  )
}
