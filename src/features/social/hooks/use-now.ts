"use client"

import { useEffect, useState } from "react"

/** L'heure actuelle, rafraîchie régulièrement : pour des libellés comme « depuis 5 min ». */
export function useNow(intervalMs = 30 * 1000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(interval)
  }, [intervalMs])

  return now
}
