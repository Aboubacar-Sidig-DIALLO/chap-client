"use client"

import { AnimatePresence, motion } from "motion/react"
import { ReducedMotionConfig, transition, useTempoTransition } from "@animate-ui/react/utils/motion"
import { cn } from "@/lib/utils"
import { formatPlaybackRate, nextPlaybackRate, type PlaybackRate } from "../lib/playback-rate"

interface PlaybackRateButtonProps {
  rate: PlaybackRate
  onClick: () => void
  /** Taille et couleur de fond, selon la carte qui l'accueille. */
  className?: string
}

/**
 * Vitesse de lecture des vocaux (×1 → ×1,5 → ×2), commune à toute la
 * conversation et retenue par l'appareil. La nouvelle valeur glisse en place.
 */
export function PlaybackRateButton({ rate, onClick, className }: PlaybackRateButtonProps) {
  const swap = useTempoTransition(transition.swap)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Vitesse de lecture : ${formatPlaybackRate(rate)}. Passer à ${formatPlaybackRate(nextPlaybackRate(rate))}`}
      className={cn(
        "press relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-foreground/10 font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
    >
      <ReducedMotionConfig>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={rate}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: swap }}
            exit={{ opacity: 0, y: -6, transition: swap }}
          >
            {formatPlaybackRate(rate)}
          </motion.span>
        </AnimatePresence>
      </ReducedMotionConfig>
    </button>
  )
}
