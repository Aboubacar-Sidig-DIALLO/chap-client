"use client"

import { useEffect, useRef, useState } from "react"

/** Distance (px) en dessous de laquelle on considère l'utilisateur « en bas ». */
const BOTTOM_THRESHOLD = 80

interface UseStickToBottomOptions {
  /** Toute valeur qui change quand du contenu est ajouté en bas de la liste. */
  trigger: unknown
  /** Force le défilement même si l'utilisateur lit l'historique (ex. message envoyé). */
  force?: boolean
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Garde la liste collée en bas quand du contenu arrive ou quand elle change de
 * taille (clavier virtuel, pièces jointes), sans perturber l'utilisateur qui
 * remonte dans l'historique.
 */
export function useStickToBottom<T extends HTMLElement>({
  trigger,
  force = false,
}: UseStickToBottomOptions) {
  const containerRef = useRef<T>(null)
  const isAtBottomRef = useRef(true)
  const hasMountedRef = useRef(false)
  const [isAtBottom, setIsAtBottom] = useState(true)

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const container = containerRef.current
    container?.scrollTo({
      top: container.scrollHeight,
      behavior: prefersReducedMotion() ? "instant" : behavior,
    })
  }

  function handleScroll() {
    const container = containerRef.current
    if (!container) return

    const distance =
      container.scrollHeight - container.scrollTop - container.clientHeight
    isAtBottomRef.current = distance < BOTTOM_THRESHOLD
    setIsAtBottom(isAtBottomRef.current)
  }

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      scrollToBottom("instant")
      return
    }

    if (force || isAtBottomRef.current) scrollToBottom()
  }, [trigger, force])

  // La liste rétrécit (ouverture du clavier…) : on garde les derniers messages visibles.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      if (isAtBottomRef.current) {
        container.scrollTop = container.scrollHeight
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return { containerRef, isAtBottom, scrollToBottom, handleScroll }
}
