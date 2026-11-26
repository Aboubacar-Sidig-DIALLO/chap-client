"use client"

import { useEffect, useRef, useState } from "react"
import { ROUTES } from "@/features/auth/lib/routes"

const FEEDBACK_MS = 2000

type InviteFeedback = "copied" | "failed" | null

const INVITE_LABEL: Record<NonNullable<InviteFeedback> | "idle", string> = {
  idle: "Inviter un proche",
  copied: "Lien copié",
  failed: "Copie impossible",
}

/**
 * Invite un proche à créer son compte : feuille de partage du téléphone si
 * elle existe, sinon lien copié dans le presse-papiers (avec un retour bref).
 */
export function useInvite() {
  const [feedback, setFeedback] = useState<InviteFeedback>(null)
  const resetTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(resetTimeoutRef.current), [])

  async function invite() {
    const url = `${window.location.origin}${ROUTES.signUp}`

    if (navigator.share) {
      // Fermer la feuille de partage n'est pas une erreur.
      await navigator.share({ title: "Rejoins-moi", text: "On se parle ici :", url }).catch(() => {})
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      setFeedback("copied")
    } catch {
      setFeedback("failed")
    }
    window.clearTimeout(resetTimeoutRef.current)
    resetTimeoutRef.current = window.setTimeout(() => setFeedback(null), FEEDBACK_MS)
  }

  return { invite, isCopied: feedback === "copied", label: INVITE_LABEL[feedback ?? "idle"] }
}
