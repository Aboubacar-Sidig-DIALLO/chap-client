"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import { CallProvider, useCall } from "@/features/call/components/call-provider"
import { CallStage } from "@/features/call/components/call-stage"
import { listen } from "@/features/chat/lib/socket"
import { createGuestCallSocket } from "../lib/api"
import { CALL_ENDED_ERROR } from "../lib/config"
import type { GuestClaim } from "../types"

/**
 * Comment l'appel s'est fini pour l'invité :
 * - `ended` : l'appel est terminé (ou son accès n'existe plus) ;
 * - `removed` : un administrateur l'a retiré ;
 * - `left` : il est sorti (ou la connexion a lâché, ou l'entrée a échoué) et
 *   peut revenir tant que l'appel dure.
 */
export type GuestCallOutcome =
  | { reason: "ended" }
  | { reason: "removed" }
  | { reason: "left"; error: string | null }

interface GuestCallRoomProps {
  claim: GuestClaim
  onOutcome: (outcome: GuestCallOutcome) => void
}

/**
 * L'appel vu par un invité : sa propre connexion (l'espace réservé aux
 * invités, avec son laissez-passer), et la même scène que les membres —
 * orbes vocaux, caméra, réactions —, sans rien d'autre autour.
 */
export function GuestCallRoom({ claim, onOutcome }: GuestCallRoomProps) {
  const [socket] = useState(() => createGuestCallSocket(claim.pass))
  /** La fin annoncée par le serveur l'emporte sur la sortie qui l'accompagne. */
  const outcomeRef = useRef<GuestCallOutcome | null>(null)

  function settle(outcome: GuestCallOutcome) {
    if (outcomeRef.current && outcomeRef.current.reason !== "left") return
    outcomeRef.current = outcome
    onOutcome(outcome)
  }
  const report = useEffectEvent(settle)

  useEffect(() => {
    const unlisten = listen(socket, {
      "call:ended": () => report({ reason: "ended" }),
      "call:removed": () => report({ reason: "removed" }),
      connect_error: (error) => {
        if (error.message === CALL_ENDED_ERROR) report({ reason: "ended" })
      },
    })
    socket.connect()
    return () => {
      unlisten()
      socket.disconnect()
    }
  }, [socket])

  return (
    <CallProvider socket={socket} isDirect={false} title={claim.group.name} currentUserId={claim.guest.id} isGuest>
      <main className="relative h-dvh overflow-hidden bg-background">
        <JoinOnArrival onLeft={(error) => settle({ reason: "left", error })} />
        <CallStage />
      </main>
    </CallProvider>
  )
}

/**
 * Entre dans l'appel dès l'arrivée (l'invité vient de le demander), puis
 * signale sa sortie : bouton « Quitter », connexion perdue, ou entrée refusée
 * (micro bloqué, appel complet…).
 */
function JoinOnArrival({ onLeft }: { onLeft: (error: string | null) => void }) {
  const { call, join } = useCall()
  const hasJoinedRef = useRef(false)
  const joinOnce = useEffectEvent(() => {
    if (hasJoinedRef.current) return
    hasJoinedRef.current = true
    join()
  })
  useEffect(() => joinOnce(), [])

  // De nouveau au repos après y être entré (ou avoir tenté) : il en est sorti.
  const [wasActive, setWasActive] = useState(false)
  const isActive = call.status !== "idle"
  const reportLeft = useEffectEvent(() => onLeft(call.error))
  if (isActive && !wasActive) setWasActive(true)
  const hasLeft = wasActive && !isActive
  useEffect(() => {
    if (hasLeft) reportLeft()
  }, [hasLeft])

  return null
}
