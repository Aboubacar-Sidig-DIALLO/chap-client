"use client"

import { useSyncExternalStore } from "react"

/** `true` si la media query correspond (toujours `false` au rendu serveur). */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

/** Écran tactile comme moyen de saisie principal (téléphone, tablette). */
export function useIsTouchDevice() {
  return useMediaQuery("(pointer: coarse)")
}
