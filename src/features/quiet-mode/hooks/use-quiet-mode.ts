"use client"

import { useEffect, useSyncExternalStore } from "react"
import { useNow } from "@/features/social/hooks/use-now"
import { quietStore } from "../lib/quiet-store"
import { quietReasonAt } from "../lib/rules"

/** Le mode calme se réévalue chaque minute (début et fin des heures calmes). */
const REEVALUATE_MS = 60 * 1000

/**
 * Les heures calmes de l'utilisateur et l'état du moment : `reason` dit
 * pourquoi il est en mode calme (à la main, ou selon son horaire), `null` s'il
 * ne l'est pas. Chargées à la première utilisation, relues au retour sur
 * l'application (un autre appareil a pu les changer).
 */
export function useQuietMode() {
  const snapshot = useSyncExternalStore(quietStore.subscribe, quietStore.getSnapshot, quietStore.getServerSnapshot)
  const now = useNow(REEVALUATE_MS)

  useEffect(() => {
    if (quietStore.getSnapshot().status === "idle") void quietStore.refresh()
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void quietStore.refresh()
    }
    document.addEventListener("visibilitychange", refreshWhenVisible)
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible)
  }, [])

  const reason = snapshot.state ? quietReasonAt(snapshot.state, new Date(now)) : null
  return { ...snapshot, reason, isQuiet: reason !== null, now: new Date(now) }
}
