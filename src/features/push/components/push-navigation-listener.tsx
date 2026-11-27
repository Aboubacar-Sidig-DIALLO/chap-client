"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Toucher une notification alors que l'application est déjà ouverte : le
 * service worker demande d'aller à la page voulue, on y navigue sans recharger.
 */
export function PushNavigationListener() {
  const router = useRouter()

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    function handleMessage(event: MessageEvent) {
      const { type, url } = (event.data ?? {}) as { type?: unknown; url?: unknown }
      if (type !== "navigate" || typeof url !== "string") return

      // Seulement une page de l'application (jamais une autre origine).
      const target = new URL(url, window.location.origin)
      if (target.origin === window.location.origin) router.push(`${target.pathname}${target.search}`)
    }

    navigator.serviceWorker.addEventListener("message", handleMessage)
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage)
  }, [router])

  return null
}
