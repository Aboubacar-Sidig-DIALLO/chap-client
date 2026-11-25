"use client"

import { useEffect, useRef, useState } from "react"

/** Distance (px) en dessous de laquelle on considère l'utilisateur « en bas ». */
const BOTTOM_THRESHOLD = 80

interface UseStickToBottomOptions {
  /** `false` tant que le premier contenu (l'historique) n'est pas arrivé. */
  isReady: boolean
  /** Toute valeur qui change quand du contenu est ajouté en bas de la liste. */
  trigger: unknown
  /** Force le défilement même si l'utilisateur lit l'historique (ex. message envoyé). */
  force?: boolean
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Garde la liste collée en bas quand du contenu arrive ou change de taille
 * (images chargées, clavier virtuel), sans perturber l'utilisateur qui remonte
 * dans l'historique.
 *
 * `containerRef` : l'élément qui défile ; `contentRef` : son contenu, dont la
 * croissance est suivie.
 */
export function useStickToBottom<T extends HTMLElement, C extends HTMLElement = HTMLDivElement>({
  isReady,
  trigger,
  force = false,
}: UseStickToBottomOptions) {
  const containerRef = useRef<T>(null)
  const contentRef = useRef<C>(null)
  /** Intention de rester en bas : seul un défilement vers le haut de l'utilisateur la retire. */
  const isPinnedRef = useRef(true)
  const lastScrollTopRef = useRef(0)
  const hasArrivedRef = useRef(false)
  const [isAtBottom, setIsAtBottom] = useState(true)

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const container = containerRef.current
    if (!container) return
    isPinnedRef.current = true
    setIsAtBottom(true)
    container.scrollTo({
      top: container.scrollHeight,
      behavior: prefersReducedMotion() ? "instant" : behavior,
    })
  }

  function handleScroll() {
    const container = containerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const isNearBottom = scrollHeight - scrollTop - clientHeight < BOTTOM_THRESHOLD
    // Nos propres défilements (et le contenu qui grandit) ne font que descendre :
    // remonter est forcément un geste de l'utilisateur.
    const hasScrolledUp = scrollTop < lastScrollTopRef.current
    lastScrollTopRef.current = scrollTop

    if (isNearBottom) isPinnedRef.current = true
    else if (hasScrolledUp) isPinnedRef.current = false
    setIsAtBottom(isPinnedRef.current)
  }

  useEffect(() => {
    if (!isReady) return
    // L'historique s'affiche directement en bas, sans défiler à travers lui.
    if (!hasArrivedRef.current) {
      hasArrivedRef.current = true
      scrollToBottom("instant")
      return
    }
    if (force || isPinnedRef.current) scrollToBottom()
  }, [isReady, trigger, force])

  // La liste rétrécit (clavier) ou son contenu grandit (image chargée) : on reste en bas.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      if (isPinnedRef.current) container.scrollTop = container.scrollHeight
    })
    observer.observe(container)
    if (contentRef.current) observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [])

  return { containerRef, contentRef, isAtBottom, scrollToBottom, handleScroll }
}
