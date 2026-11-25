"use client"

import { useState } from "react"
import { Share08Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/features/auth/lib/routes"

const COPIED_FEEDBACK_MS = 2000

/**
 * Invite un proche à créer son compte : feuille de partage du téléphone si
 * elle existe, sinon lien copié dans le presse-papiers.
 */
export function InviteButton({ variant = "outline" }: { variant?: "outline" | "default" }) {
  const [feedback, setFeedback] = useState<"copied" | "failed" | null>(null)

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
    setTimeout(() => setFeedback(null), COPIED_FEEDBACK_MS)
  }

  return (
    <Button variant={variant} onClick={invite} aria-live="polite">
      <HugeiconsIcon icon={feedback === "copied" ? Tick02Icon : Share08Icon} strokeWidth={2} data-icon="inline-start" />
      {feedback === "copied" ? "Lien copié" : feedback === "failed" ? "Copie impossible" : "Inviter un proche"}
    </Button>
  )
}
