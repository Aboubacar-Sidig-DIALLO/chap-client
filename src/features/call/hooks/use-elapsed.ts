"use client"

import { useEffect, useState } from "react"

/** « 4:07 », « 1:02:33 ». */
function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, "0")
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`
}

/** Temps écoulé depuis `since` (date ISO), mis à jour chaque seconde. */
export function useElapsed(since: string | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!since) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [since])

  if (!since) return null
  return formatElapsed(Math.max(0, Math.floor((now - Date.parse(since)) / 1000)))
}
