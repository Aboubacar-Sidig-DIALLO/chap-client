"use client"

import { motion } from "motion/react"
import { blur, transition, useTempoTransition } from "@animate-ui/react/utils/motion"
import { formatDuration } from "../lib/format"
import { Waveform } from "./waveform"

/** Pas des flèches du clavier sur la forme d'onde. */
const KEYBOARD_STEP_MS = 2000

interface VoiceReviewCardProps {
  /** Forme d'onde du vocal enregistré (amplitudes de 0 à 100). */
  levels: number[]
  /** Reçoit la progression de lecture (`--progress`, de 0 à 1), écrite sans re-rendu. */
  progressRef: React.RefObject<HTMLDivElement | null>
  currentMs: number
  durationMs: number
  isPlaying: boolean
  /** Se place à `ratio` (de 0 à 1) de la durée. */
  onSeek: (ratio: number) => void
}

/**
 * Le vocal qu'on vient d'enregistrer, à réécouter avant de l'envoyer : sa
 * forme d'onde, qui se colore au fil de la lecture et qu'on parcourt au
 * doigt, à la souris ou au clavier, et le temps écoulé sur sa durée.
 */
export function VoiceReviewCard({
  levels,
  progressRef,
  currentMs,
  durationMs,
  isPlaying,
  onSeek,
}: VoiceReviewCardProps) {
  const unfold = useTempoTransition(transition.disclosure)

  function seekFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    onSeek((event.clientX - bounds.left) / bounds.width)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const stepRatio = durationMs > 0 ? KEYBOARD_STEP_MS / durationMs : 0
    const position = durationMs > 0 ? currentMs / durationMs : 0
    const targets: Record<string, number> = {
      ArrowRight: position + stepRatio,
      ArrowUp: position + stepRatio,
      ArrowLeft: position - stepRatio,
      ArrowDown: position - stepRatio,
      Home: 0,
      End: 1,
    }
    const target = targets[event.key]
    if (target === undefined) return
    event.preventDefault()
    onSeek(Math.min(Math.max(target, 0), 1))
  }

  return (
    <motion.div
      key="review"
      initial={{ height: 0, opacity: 0, filter: blur.disclosure }}
      animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
      exit={{ height: 0, opacity: 0, filter: blur.disclosure }}
      transition={unfold}
      className="overflow-hidden"
    >
      {/* Au-dessus de l'orbe, qui dépasse de la barre : la marge lui laisse sa place. */}
      <div className="mb-14 flex flex-col gap-2 rounded-3xl border bg-background/95 px-4 pt-3 pb-2.5 shadow-sm backdrop-blur">
        <p className="text-xs font-medium text-muted-foreground">
          {isPlaying ? "Réécoute en cours…" : "Réécoutez votre vocal avant de l'envoyer"}
        </p>

        {/* Deux couches identiques : la couche vive est découpée selon `--progress`. */}
        <div
          ref={progressRef}
          role="slider"
          tabIndex={0}
          aria-label="Position dans le vocal enregistré"
          aria-valuemin={0}
          aria-valuemax={Math.round(durationMs / 1000)}
          aria-valuenow={Math.round(currentMs / 1000)}
          aria-valuetext={`${formatDuration(currentMs)} sur ${formatDuration(durationMs)}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            seekFromPointer(event)
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromPointer(event)
          }}
          onKeyDown={handleKeyDown}
          className="relative cursor-pointer touch-none rounded-sm text-voice outline-none [--progress:0] focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Waveform levels={levels} className="opacity-30" />
          <Waveform
            levels={levels}
            className="absolute inset-0"
            style={{ clipPath: "inset(0 calc((1 - var(--progress)) * 100%) 0 0)" }}
          />
        </div>

        <div className="flex justify-between text-[11px] font-medium text-muted-foreground tabular-nums">
          <span>{formatDuration(currentMs)}</span>
          <span>{formatDuration(durationMs)}</span>
        </div>
      </div>
    </motion.div>
  )
}
