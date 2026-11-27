"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"

const FEEDBACK_MS = 2000

const subscribeNever = () => () => {}

/**
 * Partager un lien : la feuille de partage du téléphone quand elle existe,
 * sinon (ou à la demande) le presse-papiers, avec un bref retour « copié ».
 */
export function useShareLink() {
  const [copyFeedback, setCopyFeedback] = useState<"copied" | "failed" | null>(null)
  const resetTimeoutRef = useRef<number | undefined>(undefined)
  // Connu du seul navigateur : rien d'écrit au rendu serveur.
  const canShare = useSyncExternalStore(subscribeNever, () => typeof navigator.share === "function", () => false)

  useEffect(() => () => window.clearTimeout(resetTimeoutRef.current), [])

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopyFeedback("copied")
    } catch {
      setCopyFeedback("failed")
    }
    window.clearTimeout(resetTimeoutRef.current)
    resetTimeoutRef.current = window.setTimeout(() => setCopyFeedback(null), FEEDBACK_MS)
  }

  async function share(url: string, text: string) {
    if (!canShare) return copy(url)
    // Fermer la feuille de partage n'est pas une erreur.
    await navigator.share({ title: "Invitation", text, url }).catch(() => {})
  }

  return { canShare, share, copy, copyFeedback }
}
