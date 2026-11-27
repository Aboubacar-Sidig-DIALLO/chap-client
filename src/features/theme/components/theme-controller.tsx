"use client"

import { useLayoutEffect, useRef } from "react"
import { useServerInsertedHTML } from "next/navigation"
import { DARK_SCHEME_QUERY, THEME_STORAGE_KEY } from "../lib/theme"
import { THEME_SCRIPT } from "../lib/theme-script"
import { themeStore } from "../lib/theme-store"

/**
 * Tient l'apparence à jour sur toutes les pages : le thème est posé avant la
 * première peinture (script inséré dans le HTML du serveur), puis suit
 * l'appareil en mode automatique et les choix faits dans un autre onglet.
 */
export function ThemeController() {
  const isScriptInserted = useRef(false)

  useServerInsertedHTML(() => {
    if (isScriptInserted.current) return null
    isScriptInserted.current = true
    return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
  })

  useLayoutEffect(() => {
    themeStore.restore()

    const darkScheme = window.matchMedia(DARK_SCHEME_QUERY)
    function handleStorage(event: StorageEvent) {
      if (event.key === null || event.key === THEME_STORAGE_KEY) themeStore.sync()
    }

    darkScheme.addEventListener("change", themeStore.sync)
    window.addEventListener("storage", handleStorage)
    return () => {
      darkScheme.removeEventListener("change", themeStore.sync)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  return null
}
