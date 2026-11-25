"use client"

import { AnimatePresence, motion } from "motion/react"
import { AnimateIcon } from "@animate-ui/react/icons"
import {
  blur,
  ReducedMotionConfig,
  scale,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { Cancel01 } from "@/components/animate-ui/icons/hugeicons/cancel-01"
import { Pause } from "@/components/animate-ui/icons/hugeicons/pause"
import { Play } from "@/components/animate-ui/icons/hugeicons/play"
import { HeadphonesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Float } from "@/components/float"
import { Button } from "@/components/ui/button"
import { VoiceBars } from "./voice-bars"
import { VoiceHalo } from "./voice-halo"
import { useVoicePlayback } from "./voice-playback"

/**
 * Mini-lecteur flottant (Hairline UI `Float`) : on continue d'écouter le vocal
 * en cours en parcourant la conversation. On le lance vers un coin, ou on le
 * range en languette contre un bord ; sa place est mémorisée.
 */
export function FloatingPlayer() {
  const playback = useVoicePlayback()
  const { nowPlaying } = playback
  const fade = useTempoTransition(transition.fade)

  return (
    // Fondu d'opacité seulement : une transformation fausserait la position de `Float`.
    <AnimatePresence>
      {nowPlaying && (
        <motion.div
          key="floating-player"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: fade }}
          exit={{ opacity: 0, transition: fade }}
        >
          <Float
            scope="container"
            defaultCorner="top-right"
            margin={12}
            storageKey="chat:floating-player"
            label="Lecture en cours"
            live={nowPlaying.isPlaying}
            edgePeek={
              <VoiceBars isActive={nowPlaying.isPlaying} className="h-3.5 text-read" />
            }
          >
            <PlayerCard />
          </Float>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PlayerCard() {
  const { nowPlaying, rate, cycleRate, toggleNowPlaying, stop, getLevel } = useVoicePlayback()
  const swap = useTempoTransition(transition.swap)
  if (!nowPlaying) return null

  return (
    <div className="flex w-72 max-w-[calc(100vw-3rem)] items-center gap-2 rounded-2xl border bg-card/95 p-1.5 pr-2 shadow-xl backdrop-blur-lg">
      {/* Les ondes donnent corps à la voix qu'on écoute. */}
      <VoiceHalo
        size={40}
        tone="voice"
        getLevel={nowPlaying.isPlaying ? getLevel : undefined}
        className="m-1"
      >
        <HugeiconsIcon icon={HeadphonesIcon} size={18} strokeWidth={2} aria-hidden />
      </VoiceHalo>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{nowPlaying.author.name}</p>
        <p className="text-xs text-muted-foreground">
          {nowPlaying.isPlaying ? "En écoute" : "En pause"}
        </p>
      </div>

      <ReducedMotionConfig>
        <AnimateIcon animateOnHover animateOnTap asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleNowPlaying}
            aria-label={nowPlaying.isPlaying ? "Mettre en pause" : "Reprendre l'écoute"}
            className="size-9"
          >
            <span className="relative inline-flex">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={nowPlaying.isPlaying ? "pause" : "play"}
                  className="inline-flex"
                  initial={{ opacity: 0, scale: scale.icon, filter: blur.icon }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: swap }}
                  exit={{ opacity: 0, scale: scale.icon, filter: blur.icon, transition: swap }}
                >
                  {nowPlaying.isPlaying ? (
                    <Pause size={14} fill="currentColor" />
                  ) : (
                    <Play size={14} fill="currentColor" />
                  )}
                </motion.span>
              </AnimatePresence>
            </span>
          </Button>
        </AnimateIcon>
      </ReducedMotionConfig>

      <button
        type="button"
        onClick={cycleRate}
        aria-label={`Vitesse de lecture : ${rate}×`}
        className="press min-w-9 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {rate}×
      </button>

      <AnimateIcon animateOnHover animateOnTap asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={stop}
          aria-label="Arrêter l'écoute"
          className="size-9 text-muted-foreground"
        >
          <Cancel01 size={16} />
        </Button>
      </AnimateIcon>
    </div>
  )
}
