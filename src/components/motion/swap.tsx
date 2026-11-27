"use client"

import { AnimatePresence, motion } from "motion/react"
import { blur, ReducedMotionConfig, transition, useTempoTransition } from "@animate-ui/react/utils/motion"

interface SwapProps {
  /** Ce qui est affiché : à chaque changement de clé, l'ancien contenu cède la place au nouveau. */
  swapKey: string
  children: React.ReactNode
  className?: string
}

/**
 * Deux états qui se remplacent sur place (une liste et son état vide, une
 * bulle et son éditeur…) : fondu enchaîné, avec un léger flou qui fait le
 * lien (Animate UI, `recipes/swap.md`). L'ancien sort du flux aussitôt ;
 * envelopper dans `AutoHeight` quand la hauteur change.
 */
export function Swap({ swapKey, children, className }: SwapProps) {
  const swap = useTempoTransition(transition.swap)

  return (
    <ReducedMotionConfig>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={swapKey}
          initial={{ opacity: 0, filter: blur.icon }}
          animate={{ opacity: 1, filter: "blur(0px)", transition: swap, transitionEnd: { filter: "none" } }}
          exit={{ opacity: 0, filter: blur.icon, transition: swap }}
          className={className}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </ReducedMotionConfig>
  )
}
