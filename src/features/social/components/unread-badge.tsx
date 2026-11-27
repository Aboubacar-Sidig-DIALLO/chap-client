"use client"

import { AnimatePresence, motion } from "motion/react"
import {
  blur,
  ReducedMotionConfig,
  scale,
  spring,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"

/**
 * Pastille du nombre de messages non lus ; rien s'il n'y en a pas. Elle
 * apparaît et s'efface en douceur, et le nombre change sur place (un message
 * retiré par son auteur la fait redescendre, ou disparaître).
 */
export function UnreadBadge({ count }: { count: number }) {
  const pop = useTempoTransition(spring.pop)
  const swap = useTempoTransition(transition.swap)
  const label = count > 99 ? "99+" : String(count)

  return (
    <ReducedMotionConfig>
      <AnimatePresence initial={false}>
        {count > 0 && (
          <motion.span
            key="badge"
            initial={{ opacity: 0, scale: scale.icon }}
            animate={{ opacity: 1, scale: 1, transition: pop }}
            exit={{ opacity: 0, scale: scale.icon, transition: swap }}
            className="flex h-5 min-w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-voice px-1.5 text-xs font-semibold text-voice-foreground tabular-nums"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 6, filter: blur.icon }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: swap }}
                exit={{ opacity: 0, y: -6, filter: blur.icon, transition: swap }}
              >
                {label}
              </motion.span>
            </AnimatePresence>
            <span className="sr-only">
              {" "}
              nouveau{count > 1 ? "x" : ""} message{count > 1 ? "s" : ""}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </ReducedMotionConfig>
  )
}
