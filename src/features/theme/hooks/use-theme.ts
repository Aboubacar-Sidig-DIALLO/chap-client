"use client"

import { useSyncExternalStore } from "react"
import { themeStore } from "../lib/theme-store"

/**
 * L'apparence : `preference` (automatique, clair ou sombre), `resolved` (le
 * thème affiché) et `setPreference` pour la changer.
 */
export function useTheme() {
  const snapshot = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, themeStore.getServerSnapshot)
  return { ...snapshot, setPreference: themeStore.setPreference }
}
