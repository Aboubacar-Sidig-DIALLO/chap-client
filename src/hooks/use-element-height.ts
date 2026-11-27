"use client"

import { useEffect, useState } from "react"

/**
 * Hauteur d'un élément, tenue à jour quand son contenu change (ResizeObserver).
 * À poser sur l'élément avec la référence renvoyée ; `null` avant la première mesure.
 */
export function useElementHeight<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const [height, setHeight] = useState<number | null>(null)

  useEffect(() => {
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.borderBoxSize[0]?.blockSize ?? entry.target.getBoundingClientRect().height)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return [setElement, height] as const
}
