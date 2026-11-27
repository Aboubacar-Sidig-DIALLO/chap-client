"use client"

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { blur, ReducedMotionConfig, scale, spring, transition, useTempoTransition } from "@animate-ui/react/utils/motion"

/**
 * Confirmation discrète à côté du bouton (« Enregistré ») : elle apparaît
 * d'un petit bond et s'efface en fondu. La zone d'annonce existe dès le
 * départ, pour que les lecteurs d'écran disent bien le texte (rules A17).
 */
export function SavedStatus({ show, children }: { show: boolean; children: React.ReactNode }) {
  const pop = useTempoTransition(spring.pop)
  const fade = useTempoTransition(transition.fade)

  return (
    <ReducedMotionConfig>
      <span role="status" className="flex">
        <AnimatePresence initial={false}>
          {show && (
            <motion.span
              key="saved"
              initial={{ opacity: 0, scale: scale.action, filter: blur.icon }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: pop }}
              exit={{ opacity: 0, filter: blur.icon, transition: fade }}
              className="flex origin-right items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400"
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} aria-hidden />
              {children}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </ReducedMotionConfig>
  )
}
