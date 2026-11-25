import { Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "cn"

interface SpinnerProps {
  size?: number
  className?: string
}

/**
 * Indicateur de chargement. Sous « réduire les animations », il tourne plus
 * lentement au lieu de se figer : il doit continuer à dire « ça charge ».
 */
function Spinner({ size = 16, className }: SpinnerProps) {
  return (
    <HugeiconsIcon
      data-slot="spinner"
      icon={Loading03Icon}
      size={size}
      strokeWidth={2}
      aria-hidden
      className={cn("animate-spin motion-reduce:[animation-duration:2.5s]", className)}
    />
  )
}

export { Spinner }
