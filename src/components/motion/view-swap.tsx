"use client"

import { useRef } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  blur,
  ReducedMotionConfig,
  shift,
  transition,
  useShouldReduceMotion,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { AutoHeight } from "./auto-height"

/** `1` : on avance (la vue suivante arrive de la droite) ; `-1` : on revient. */
export type ViewDirection = 1 | -1

const FOCUSABLE = 'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex="-1"]'

interface ViewSwapProps {
  /** Vue affichée ; à chaque changement, elle glisse dans le sens de `direction`. */
  viewKey: string
  direction: ViewDirection
  children: React.ReactNode
  /** Mise en page de la vue (`flex flex-col gap-5`…). */
  className?: string
}

/**
 * Écrans successifs d'un même panneau (fiche → réglages → retour) : la vue
 * suivante arrive du côté où l'on va, la précédente part de l'autre, et la
 * hauteur du panneau suit (Animate UI, `interactions/form-steps.md`).
 *
 * Le focus suit le mouvement : si le bouton qui a changé de vue a disparu,
 * il passe au premier élément actif de la nouvelle vue (rules A17).
 */
export function ViewSwap({ viewKey, direction, children, className }: ViewSwapProps) {
  return (
    <ReducedMotionConfig>
      <Views viewKey={viewKey} direction={direction} className={className}>
        {children}
      </Views>
    </ReducedMotionConfig>
  )
}

function Views({ viewKey, direction, children, className }: ViewSwapProps) {
  const reduce = useShouldReduceMotion()
  const leave = useTempoTransition(transition.panelOut)
  const enter = useTempoTransition(transition.panelIn)
  const viewRef = useRef<HTMLDivElement>(null)

  const away = (sign: number) => ({
    opacity: 0,
    filter: blur.panel,
    transform: `translateX(${reduce ? 0 : sign * shift.step}px)`,
  })
  const variants = {
    enter: (dir: number) => away(dir),
    center: { opacity: 1, filter: "blur(0px)", transform: "translateX(0px)", transition: enter },
    exit: (dir: number) => ({ ...away(-dir), transition: leave }),
  }

  return (
    <AutoHeight>
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={viewKey}
          ref={viewRef}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          onAnimationComplete={(name) => {
            const view = viewRef.current
            if (name !== "center" || !view || view.contains(document.activeElement)) return
            // Focus perdu avec la vue précédente : il reprend dans la nouvelle.
            if (document.activeElement === document.body || !document.activeElement?.isConnected) {
              view.querySelector<HTMLElement>(FOCUSABLE)?.focus()
            }
          }}
          className={className}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </AutoHeight>
  )
}
