"use client"

import { useEffect } from "react"

/**
 * Expose la zone réellement visible en variables CSS (`--viewport-height`,
 * `--viewport-offset-top`). Sur iOS, le clavier virtuel recouvre la page sans
 * la redimensionner : un conteneur calé sur ces variables garde l'en-tête et le
 * champ de saisie visibles au-dessus du clavier.
 */
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const root = document.documentElement

    function update() {
      // Zoom à deux doigts : on laisse le navigateur gérer, sans redimensionner l'app.
      if (!viewport || viewport.scale > 1.01) return
      root.style.setProperty("--viewport-height", `${viewport.height}px`)
      root.style.setProperty("--viewport-offset-top", `${viewport.offsetTop}px`)
    }

    update()
    viewport.addEventListener("resize", update)
    viewport.addEventListener("scroll", update)

    return () => {
      viewport.removeEventListener("resize", update)
      viewport.removeEventListener("scroll", update)
      root.style.removeProperty("--viewport-height")
      root.style.removeProperty("--viewport-offset-top")
    }
  }, [])
}
