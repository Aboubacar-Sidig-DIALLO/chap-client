"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
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
interface SessionGateProps {
  children: (user: SessionUser) => React.ReactNode
  /** Emplacement de l'attente, le temps de vérifier la session. */
  fallbackClassName?: string
}

export function SessionGate({ children, fallbackClassName }: SessionGateProps) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && !session) router.replace(ROUTES.signIn)
  }, [isPending, session, router])

  if (!session) {
    return (
      <div aria-busy={isPending} className={cn("flex min-h-dvh items-center justify-center", fallbackClassName)}>
        {isPending && <Spinner size={24} className="text-muted-foreground" />}
      </div>
    )
  }

  return children(session.user)
}
