import { cn } from "@/lib/utils"

/** Hauteur minimale d'une barre (%), pour que les silences restent visibles. */
const MIN_BAR_HEIGHT = 12

interface WaveformProps extends React.ComponentProps<"div"> {
  /** Amplitudes de 0 à 100, une par barre. */
  levels: number[]
}

/** Forme d'onde en barres arrondies, de la couleur du texte (`currentColor`). */
export function Waveform({ levels, className, ...props }: WaveformProps) {
  return (
    <div
      aria-hidden
      className={cn("flex h-8 items-center gap-0.5", className)}
      {...props}
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className="min-w-0.5 flex-1 rounded-full bg-current"
          style={{ height: `${Math.max(level, MIN_BAR_HEIGHT)}%` }}
        />
      ))}
    </div>
  )
}
