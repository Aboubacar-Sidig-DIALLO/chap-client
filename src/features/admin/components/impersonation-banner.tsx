"use client"

import { useState } from "react"
import { UserSwitchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ROUTES } from "@/features/auth/lib/routes"
import { authClient } from "@/lib/auth-client"
import { adminApi } from "../lib/api"

/**
 * Bandeau permanent pendant qu'un administrateur utilise l'application « en
 * tant que » quelqu'un : il sait toujours sous quelle identité il agit, et
 * revient à son compte en un geste.
 */
export function ImpersonationBanner() {
  const { data: session } = authClient.useSession()
  const [isLeaving, setIsLeaving] = useState(false)
  if (!session?.session.impersonatedBy) return null

  async function stop() {
    setIsLeaving(true)
    try {
      await adminApi.stopImpersonating()
      // Rechargement complet : connexions temps réel et données repartent de zéro.
      window.location.assign(ROUTES.admin)
    } catch {
      setIsLeaving(false)
    }
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-70 flex items-center justify-center gap-3 bg-amber-400 px-4 pt-[max(0.375rem,env(safe-area-inset-top))] pb-1.5 text-sm text-amber-950"
    >
      <HugeiconsIcon icon={UserSwitchIcon} size={16} strokeWidth={2} aria-hidden className="shrink-0" />
      <p className="min-w-0 truncate">
        Vous êtes connecté en tant que <strong className="font-semibold">{session.user.name}</strong>
      </p>
      <Button
        size="xs"
        onClick={() => void stop()}
        disabled={isLeaving}
        className="shrink-0 rounded-full bg-amber-950 text-amber-50 hover:bg-amber-950/90"
      >
        {isLeaving && <Spinner size={10} />}
        Revenir à mon compte
      </Button>
    </div>
  )
}
