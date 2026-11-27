"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { authHref, ROUTES } from "../lib/routes"

export interface SessionUser {
  id: string
  name: string
  email: string
  image?: string | null
  /** Plugin Admin de Better Auth : `admin` ouvre l'administration. */
  role?: string | null
}

/**
 * Réserve une page aux utilisateurs connectés : sans session (ou quand elle
 * disparaît, après une déconnexion), direction la page de connexion, qui
 * ramènera ensuite à cette page.
 */
interface SessionGateProps {
  children: (user: SessionUser) => React.ReactNode
  /** Emplacement de l'attente, le temps de vérifier la session. */
  fallbackClassName?: string
}

export function SessionGate({ children, fallbackClassName }: SessionGateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending } = authClient.useSession()

  // Une fois connecté, on revient ici (ex. une invitation ouverte sans session).
  useEffect(() => {
    if (!isPending && !session) router.replace(authHref(ROUTES.signIn, { next: pathname }))
  }, [isPending, session, router, pathname])

  if (!session) {
    return (
      <div aria-busy={isPending} className={cn("flex min-h-dvh items-center justify-center", fallbackClassName)}>
        {isPending && <Spinner size={24} className="text-muted-foreground" />}
      </div>
    )
  }

  return children(session.user)
}
