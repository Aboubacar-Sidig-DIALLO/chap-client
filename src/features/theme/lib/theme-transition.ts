import { applyTheme, currentTheme } from "./theme-dom"
import type { ResolvedTheme } from "./theme"

export interface ScreenPoint {
  x: number
  y: number
}

/** Pendant le changement, les transitions CSS des éléments sont coupées : tout bascule d'un seul geste. */
const SWITCHING_ATTRIBUTE = "data-theme-switching"
const REVEAL_DURATION_MS = 560
const REVEAL_EASING = "cubic-bezier(0.22, 1, 0.36, 1)"

let running: ViewTransition | null = null

/**
 * Passe au thème `theme` : le nouveau se dévoile en cercle depuis `origin`
 * (l'option touchée) ; sans point de départ ou sous « réduire les animations »,
 * en simple fondu. Sans View Transitions, la bascule est immédiate.
 */
export function transitionTheme(theme: ResolvedTheme, origin?: ScreenPoint) {
  if (currentTheme() === theme) return
  running?.skipTransition()

  if (typeof document.startViewTransition !== "function") {
    swapInstantly(theme)
    return
  }

  const root = document.documentElement
  const shouldReveal = origin !== undefined && !prefersReducedMotion()
  root.setAttribute(SWITCHING_ATTRIBUTE, shouldReveal ? "reveal" : "fade")

  const transition = document.startViewTransition(() => applyTheme(theme))
  running = transition
  void transition.finished.finally(() => {
    if (running !== transition) return
    running = null
    root.removeAttribute(SWITCHING_ATTRIBUTE)
  })

  if (!shouldReveal) return
  transition.ready.then(() => revealFrom(origin)).catch(() => undefined)
}

function revealFrom({ x, y }: ScreenPoint) {
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  document.documentElement.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
    { duration: REVEAL_DURATION_MS, easing: REVEAL_EASING, pseudoElement: "::view-transition-new(root)" }
  )
}

/** Bascule sans fondu élément par élément (sinon chacun change de couleur à son rythme). */
function swapInstantly(theme: ResolvedTheme) {
  const root = document.documentElement
  root.setAttribute(SWITCHING_ATTRIBUTE, "instant")
  applyTheme(theme)
  // Force le recalcul des styles avant de rendre les transitions.
  void window.getComputedStyle(root).color
  requestAnimationFrame(() => root.removeAttribute(SWITCHING_ATTRIBUTE))
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
