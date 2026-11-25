"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"
import { ROUTES } from "../lib/routes"

export interface SessionUser {
  id: string
  name: string
  image?: string | null
}

/**
 * Réserve une page aux utilisateurs connectés : sans session (ou quand elle
 * disparaît, après une déconnexion), direction la page de connexion.
 */
export function SessionGate({ children }: { children: (user: SessionUser) => React.ReactNode }) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && !session) router.replace(ROUTES.signIn)
  }, [isPending, session, router])

  if (!session) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        {isPending && <Spinner size={24} className="text-muted-foreground" />}
      </main>
    )
  }

  return children(session.user)
}
