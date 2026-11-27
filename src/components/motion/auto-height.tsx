"use client"

import { motion } from "motion/react"
import { ReducedMotionConfig, spring, useTempoTransition } from "@animate-ui/react/utils/motion"
import { useElementHeight } from "@/hooks/use-element-height"
import { cn } from "@/lib/utils"

interface AutoHeightProps {
  children: React.ReactNode
  /** Classes du contenu mesuré (sa mise en page : `flex flex-col gap-4`…). */
  className?: string
}

/**
 * Hauteur qui suit son contenu en douceur (`spring.height`) : ce qui est
 * dessous glisse au lieu de sauter quand le contenu change (une vue, une
 * liste qui se vide…). Le débord reste visible de quelques pixels, pour ne
 * pas couper les anneaux de focus.
 */
export function AutoHeight({ children, className }: AutoHeightProps) {
  const [contentRef, height] = useElementHeight<HTMLDivElement>()
  const resize = useTempoTransition(spring.height)

  return (
    <ReducedMotionConfig>
      <motion.div
        initial={false}
        animate={{ height: height ?? "auto" }}
        transition={resize}
        style={{ overflow: "clip", overflowClipMargin: 6 }}
      >
        <div ref={contentRef} className={cn("relative", className)}>
          {children}
        </div>
      </motion.div>
    </ReducedMotionConfig>
  )
}
