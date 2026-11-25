"use client"

import { useEffect, useEffectEvent, useSyncExternalStore } from "react"

const SHORTCUT_KEY = "k"

function isApplePlatform() {
  return /Mac|iPhone|iPad/.test(navigator.userAgent)
}

/** Libellé du raccourci selon le clavier : « ⌘ K » sur Mac, « Ctrl K » ailleurs. */
export function useSearchShortcutLabel() {
  return useSyncExternalStore(
    () => () => {},
    () => (isApplePlatform() ? "⌘ K" : "Ctrl K"),
    () => null
  )
}

/** ⌘ K (Mac) ou Ctrl K : `onTrigger`, depuis n'importe où dans l'application. */
export function useSearchShortcut(onTrigger: () => void) {
  const trigger = useEffectEvent(onTrigger)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== SHORTCUT_KEY || event.altKey || event.shiftKey) return
      if (!(isApplePlatform() ? event.metaKey : event.ctrlKey)) return
      event.preventDefault()
      trigger()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])
}
