"use client"

import { motion, useIsPresent, type HTMLMotionProps } from "motion/react"
import { blur, transition, useTempoTransition } from "@animate-ui/react/utils/motion"

/**
 * Bloc qui, en partant, se replie sur place (hauteur, fondu, léger flou) :
 * ce qui suit remonte en douceur au lieu de sauter. À placer dans un
 * `AnimatePresence`. Il ne coupe son débord et ne devient inerte (rules A17)
 * que pendant sa sortie : à l'arrêt, rien n'est rogné.
 */
export function CollapseOnExit({ style, ...props }: HTMLMotionProps<"div">) {
  const collapse = useTempoTransition(transition.collapse)
  const isPresent = useIsPresent()

  return (
    <motion.div
      exit={{ opacity: 0, height: 0, filter: blur.disclosure, transition: collapse }}
      inert={!isPresent}
      style={{ ...style, overflow: isPresent ? undefined : "clip" }}
      {...props}
    />
  )
}
