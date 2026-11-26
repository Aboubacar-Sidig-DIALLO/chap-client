"use client"

import { refreshSession } from "@/features/auth/lib/session-signal"
import { useSocialEvents } from "@/features/social/hooks/use-social-events"
import { authClient } from "@/lib/auth-client"

/**
 * Quand toutes les sessions sont fermées (adresse changée ou compte supprimé,
 * depuis un autre appareil), la session est relue : elle n'existe plus, et
 * chaque page réservée renvoie aussitôt vers la connexion (`SessionGate`).
 */
export function SessionEndedListener() {
  const { data: session } = authClient.useSession()
  if (!session) return null
  return <RefreshSessionWhenEnded key={session.user.id} />
}

function RefreshSessionWhenEnded() {
  useSocialEvents({
    onSessionEnded: refreshSession,
    // Appareil hors ligne ou en veille au moment de l'annonce : à son retour,
    // la reconnexion refusée en tient lieu.
    onConnectError: (error) => {
      if (error.message === "UNAUTHORIZED") refreshSession()
    },
  })
  return null
}
