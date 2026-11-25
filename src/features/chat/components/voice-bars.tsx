import { cn } from "@/lib/utils"

/** Décalages des barres : un mouvement de voix plutôt qu'une vague régulière. */
const BAR_DELAYS_MS = [0, 160, 320, 80]

interface VoiceBarsProps {
  /** Figées quand le son est en pause. */
  isActive?: boolean
  className?: string
}

/**
 * Petites barres qui battent comme un égaliseur : le signe « du son passe en
 * ce moment » (enregistrement, lecture, écoute par un autre participant).
 * Elles prennent la couleur du texte (`currentColor`) et la hauteur du parent
 * (`h-*` via `className`).
 */
export function VoiceBars({ isActive = true, className }: VoiceBarsProps) {
  return (
    <span aria-hidden className={cn("flex h-3 items-center gap-0.5", className)}>
      {BAR_DELAYS_MS.map((delay) => (
        <span
          key={delay}
          className={cn(
            "h-full w-0.75 animate-voice-bar rounded-full bg-current",
            !isActive && "[animation-play-state:paused]"
          )}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}
