"use client"

import { useEffect, useEffectEvent, useRef } from "react"
import { useCall } from "./call-provider"

/**
 * Rejoint l'appel en cours dès que la conversation connaît ses participants
 * (arrivée par « Rejoindre » depuis l'accueil ou la sonnerie). Si l'appel
 * s'est terminé entre-temps, on n'en relance pas un : la conversation s'ouvre
 * simplement.
 */
export function AutoJoinCall({ onHandled }: { onHandled: () => void }) {
  const { call, join } = useCall()
  const isHandledRef = useRef(false)
  const handle = useEffectEvent((hasOngoingCall: boolean) => {
    if (hasOngoingCall) join()
    onHandled()
  })

  useEffect(() => {
    if (isHandledRef.current || !call.isSynced) return
    isHandledRef.current = true
    handle(call.participants.length > 0)
  }, [call.isSynced, call.participants.length])

  return null
}
