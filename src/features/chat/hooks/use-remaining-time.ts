"use client"

import { useEffect, useState } from "react"
import { msUntilNextChange } from "../lib/expiry"

/**
 * Le temps qu'il reste (ms) jusqu'à `expiresAt` (date ISO 8601). Rafraîchi
 * seulement quand le libellé affiché change : une fois par minute, puis
 * chaque seconde pendant la dernière minute — jamais plus souvent.
 */
export function useRemainingTime(expiresAt: string) {
  const [now, setNow] = useState(() => Date.now())
  const remainingMs = Math.max(0, Date.parse(expiresAt) - now)

  useEffect(() => {
    const delay = msUntilNextChange(remainingMs)
    if (delay === null) return
    const timeout = setTimeout(() => setNow(Date.now()), delay)
    return () => clearTimeout(timeout)
  }, [remainingMs])

  return remainingMs
}
