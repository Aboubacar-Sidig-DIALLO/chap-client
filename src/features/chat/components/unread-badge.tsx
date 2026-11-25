"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence, motion, useAnimate } from "motion/react"
import { SlidingNumber } from "@animate-ui/react/primitives/texts/sliding-number"
import {
  scale,
  spring,
  transition,
  useShouldReduceMotion,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"

const MAX_DISPLAYED = 99

/**
 * Pastille de messages non lus (Animate UI, `interactions/count-badge.md`) :
 * les chiffres roulent, et la pastille rebondit quand le compte augmente.
 */
export function UnreadBadge({ count }: { count: number }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>()
  const reduce = useShouldReduceMotion()
  const bump = useTempoTransition(spring.bounce)
  const pop = useTempoTransition(spring.checkPop)
  const popOut = useTempoTransition(transition.popOut)
  const previous = useRef(count)

  useEffect(() => {
    const grew = count > previous.current
    previous.current = count
    if (grew && !reduce && scope.current) {
      animate(scope.current, { scale: [1.15, 1] }, bump)
    }
  }, [count, reduce, animate, scope, bump])

  return (
    <AnimatePresence initial={false}>
      {count > 0 && (
        // Petite marque sur un contrôle : elle peut naître de `scale.icon`.
        <motion.span
          key="badge"
          aria-hidden
          initial={{ opacity: 0, scale: scale.icon }}
          animate={{ opacity: 1, scale: 1, transition: pop }}
          exit={{ opacity: 0, scale: scale.icon, transition: popOut }}
          className="absolute -top-1.5 -right-1.5"
        >
          <span
            ref={scope}
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground tabular-nums ring-2 ring-background"
          >
            {count > MAX_DISPLAYED ? (
              `${MAX_DISPLAYED}+`
            ) : (
              <SlidingNumber number={count} />
            )}
          </span>
        </motion.span>
      )}
    </AnimatePresence>
  )
}
