"use client"

import { AnimatePresence, motion, useIsPresent, type HTMLMotionProps } from "motion/react"
import { ReducedMotionConfig, spring, transition, useTempoTransition } from "@animate-ui/react/utils/motion"

/**
 * Une liste qui reste la même liste quand elle change (Animate UI,
 * `interactions/list.md`) : un élément ajouté monte en fondu là où il arrive,
 * un élément retiré s'efface sur place et les autres resserrent le rang.
 *
 * À placer dans le `<ul>` (ou le `<tbody>`), autour des `AnimatedItem`. Les
 * éléments déjà là au premier affichage ne s'animent pas. L'espace entre les
 * éléments doit être un `gap` ou une bordure par élément, jamais une marge :
 * l'élément qui part sort du flux aussitôt.
 */
export function AnimatedItems({ children }: { children: React.ReactNode }) {
  return (
    <ReducedMotionConfig>
      <AnimatePresence mode="popLayout" initial={false}>
        {children}
      </AnimatePresence>
    </ReducedMotionConfig>
  )
}

type AnimatedItemProps<Tag extends "li" | "tr"> = HTMLMotionProps<Tag> & {
  /** `li` par défaut ; `tr` dans un tableau. */
  as?: Tag
}

/**
 * Un élément de liste animé. Pendant sa sortie, il est inerte : la touche
 * Tab ne peut plus s'y poser (rules A17).
 */
export function AnimatedItem<Tag extends "li" | "tr" = "li">({ as, ...props }: AnimatedItemProps<Tag>) {
  const move = useTempoTransition(spring.reflow)
  const fade = useTempoTransition(transition.fade)
  const isPresent = useIsPresent()
  const Component = (as === "tr" ? motion.tr : motion.li) as typeof motion.li

  return (
    <Component
      layout="position"
      inert={!isPresent}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { ...move, opacity: fade } }}
      exit={{ opacity: 0, scale: 0.96, transition: fade }}
      transition={move}
      {...(props as HTMLMotionProps<"li">)}
    />
  )
}
