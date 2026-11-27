"use client"

import { AnimatePresence, motion } from "motion/react"
import { blur, ReducedMotionConfig, transition, useTempoTransition } from "@animate-ui/react/utils/motion"
import { cn } from "@/lib/utils"

const collapsed = { height: 0, opacity: 0, filter: blur.disclosure }
const expanded = { height: "auto", opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }

interface RevealProps {
  show: boolean
  children: React.ReactNode
  /**
   * Espace que le parent met entre ses enfants (`gap`) : des pixels, ou une
   * longueur CSS (`var(--gap)`) s'il change selon l'écran. Il est déplacé
   * dans l'élément, qui l'ouvre et le referme avec lui : rien ne saute autour.
   */
  gap?: number | string
  /** Où est cet espace : avant l'élément (par défaut), ou après s'il est le premier de son parent. */
  gapSide?: "before" | "after"
  className?: string
}

/**
 * Un élément qui apparaît ou disparaît sur place (erreur, confirmation, champ
 * supplémentaire, section) : il se déplie et pousse doucement ce qui suit, au
 * lieu de le faire sauter (Animate UI, `recipes/disclosure.md`).
 * Sous « réduire les animations », la hauteur change d'un coup ; le fondu reste.
 */
export function Reveal({ show, children, gap, gapSide = "before", className }: RevealProps) {
  const unfold = useTempoTransition(transition.disclosure)
  const space = typeof gap === "number" ? `${gap}px` : gap
  const [margin, padding] = gapSide === "before" ? ["marginTop", "paddingTop"] : ["marginBottom", "paddingBottom"]

  return (
    <ReducedMotionConfig>
      <AnimatePresence initial={false}>
        {show && (
          <motion.div
            key="reveal"
            initial={collapsed}
            animate={expanded}
            exit={collapsed}
            transition={unfold}
            // Le débord reste visible de quelques pixels : les anneaux de focus ne sont pas coupés.
            style={{ overflow: "clip", overflowClipMargin: 6, [margin]: space && `calc(-1 * ${space})` }}
          >
            <div style={space ? { [padding]: space } : undefined} className={cn(className)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ReducedMotionConfig>
  )
}
