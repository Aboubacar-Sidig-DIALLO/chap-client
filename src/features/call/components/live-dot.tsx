import { cn } from "@/lib/utils"

/** Le point « en direct » : couleur de la voix, avec une onde qui s'en échappe. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-2 shrink-0", className)}>
      <span className="absolute inset-0 rounded-full bg-voice motion-safe:animate-voice-breathe" />
      <span className="relative size-full rounded-full bg-voice" />
    </span>
  )
}
