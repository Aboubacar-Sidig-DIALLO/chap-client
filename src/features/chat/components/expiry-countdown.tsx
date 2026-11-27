"use client"

import { HourglassIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { useRemainingTime } from "../hooks/use-remaining-time"
import { expiryPhase, formatRemaining, formatRemainingLong } from "../lib/expiry"

const PHASE_CLASS = {
  calm: "text-muted-foreground",
  soon: "text-amber-600 dark:text-amber-400",
  final: "text-destructive",
} as const

/**
 * « ⏳ 42 min » sous une suite de messages : le temps qu'il reste avant que
 * le premier d'entre eux disparaisse. Discret tant qu'il reste du temps, il se
 * fait explicite sous 10 minutes (« disparaît dans 4 min »), puis compte les
 * secondes. Pas d'annonce vocale à chaque changement : le libellé complet est
 * lu quand on y arrive.
 */
export function ExpiryCountdown({ expiresAt, className }: { expiresAt: string; className?: string }) {
  const remainingMs = useRemainingTime(expiresAt)
  const phase = expiryPhase(remainingMs)

  return (
    <time
      dateTime={expiresAt}
      aria-label={`Disparaît dans ${formatRemainingLong(remainingMs)}`}
      title="Les messages disparaissent une heure après leur envoi"
      className={cn("flex items-center gap-1 tabular-nums transition-colors duration-500", PHASE_CLASS[phase], className)}
    >
      <HugeiconsIcon
        icon={HourglassIcon}
        size={12}
        strokeWidth={2}
        aria-hidden
        className={cn("shrink-0", phase === "final" && "animate-hourglass")}
      />
      {phase === "calm" ? formatRemaining(remainingMs) : `disparaît dans ${formatRemaining(remainingMs)}`}
    </time>
  )
}
