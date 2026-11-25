"use client"

import { cn } from "@/lib/utils"
import { useLevelVariable } from "../hooks/use-audio-level"

export type VoiceHaloTone = "voice" | "recording" | "muted"

const SURFACE: Record<VoiceHaloTone, string> = {
  voice: "bg-voice text-voice-foreground shadow-voice/40",
  recording: "bg-destructive text-white shadow-destructive/40",
  muted: "bg-muted-foreground text-background shadow-black/20",
}

const RING: Record<VoiceHaloTone, string> = {
  voice: "bg-voice",
  recording: "bg-destructive",
  muted: "bg-muted-foreground",
}

interface VoiceHaloProps {
  /** Diamètre du disque (px) ; les ondes débordent autour. */
  size: number
  tone: VoiceHaloTone
  /** Volume lu à chaque image : les ondes s'ouvrent avec la voix. */
  getLevel?: () => number
  /** Une onde s'échappe en boucle : l'invitation à parler, au repos. */
  isBreathing?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * La signature visuelle de l'application : un disque de couleur « voix »
 * entouré d'ondes qui respirent au repos et suivent le volume réel (le micro
 * pendant un enregistrement, la voix lue pendant l'écoute).
 */
export function VoiceHalo({
  size,
  tone,
  getLevel,
  isBreathing = false,
  className,
  children,
}: VoiceHaloProps) {
  const ref = useLevelVariable<HTMLDivElement>(getLevel)

  return (
    <div
      ref={ref}
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Ondes du volume : la proche suit la voix, la lointaine l'amplifie. */}
      <span
        aria-hidden
        className={cn(
          "voice-ring absolute inset-0 rounded-full opacity-15 [--ring-gain:1.4]",
          RING[tone]
        )}
      />
      <span
        aria-hidden
        className={cn(
          "voice-ring absolute inset-0 rounded-full opacity-25 [--ring-gain:0.7]",
          RING[tone]
        )}
      />
      {isBreathing && (
        <span
          aria-hidden
          className={cn("absolute inset-0 rounded-full motion-safe:animate-voice-breathe", RING[tone])}
        />
      )}

      <span
        className={cn(
          "relative grid size-full place-items-center rounded-full shadow-lg transition-[background-color,color,box-shadow] duration-200",
          SURFACE[tone]
        )}
      >
        {children}
      </span>
    </div>
  )
}
