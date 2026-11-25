"use client"

import { Progress } from "@animate-ui/react/primitives/base-ui/progress"
import { cn } from "@/lib/utils"

interface ProgressLineProps {
  /** Progression de 0 à 1. */
  value: number
  label: string
  className?: string
  indicatorClassName?: string
}

/** Fine barre de progression : la primitive Animate UI la fait glisser sur `spring.progress`. */
export function ProgressLine({
  value,
  label,
  className,
  indicatorClassName,
}: ProgressLineProps) {
  return (
    <Progress.Root value={Math.round(value * 100)} aria-label={label}>
      <Progress.Track className={cn("h-1 overflow-hidden bg-primary/15", className)}>
        <Progress.Indicator className={cn("h-full bg-primary", indicatorClassName)} />
      </Progress.Track>
    </Progress.Root>
  )
}
