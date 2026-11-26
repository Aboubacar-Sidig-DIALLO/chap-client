"use client"

import { useEffect, useEffectEvent } from "react"
import { acquireSocialSocket, releaseSocialSocket } from "../lib/socket"
import type { CallChange, CallInvite, MessageNotice, PresenceChange, SocialNotice } from "../types"

interface SocialEventHandlers {
  /**
   * Connexion établie (ou déjà établie au moment d'écouter), puis après chaque
   * coupure : c'est le moment de (re)charger les listes, rien ne sera manqué.
   */
  onConnect?: () => void
  /** Les listes ont changé côté serveur ; `notice` est à annoncer s'il est présent. */
  onChange?: (notice: SocialNotice | null) => void
  /** Un ami ou un groupe vient d'écrire (le contenu n'est pas transmis). */
  onMessage?: (notice: MessageNotice) => void
  /** Un ami arrive ou quitte l'application. */
  onPresence?: (change: PresenceChange) => void
  /** Un appel commence dans une de vos conversations : il sonne. */
  onCallStarted?: (invite: CallInvite) => void
  /** Un appel a commencé, changé de participants ou pris fin. */
  onCallChanged?: (change: CallChange) => void
  /** Toutes vos sessions ont été fermées, ici ou depuis un autre appareil. */
  onSessionEnded?: () => void
  /**
   * Connexion impossible ; nouvel essai automatique. `error.message` vaut
   * `UNAUTHORIZED` quand la session n'est plus valide.
   */
  onConnectError?: (error: Error) => void
}

/** Écoute les événements sociaux en temps réel, tant que le composant est affiché. */
export function useSocialEvents(handlers: SocialEventHandlers) {
  const handleConnect = useEffectEvent(() => handlers.onConnect?.())
  const handleChange = useEffectEvent((notice: SocialNotice | null) => handlers.onChange?.(notice))
  const handleMessage = useEffectEvent((notice: MessageNotice) => handlers.onMessage?.(notice))
  const handlePresence = useEffectEvent((change: PresenceChange) => handlers.onPresence?.(change))
  const handleCallStarted = useEffectEvent((invite: CallInvite) => handlers.onCallStarted?.(invite))
  const handleCallChanged = useEffectEvent((change: CallChange) => handlers.onCallChanged?.(change))
  const handleSessionEnded = useEffectEvent(() => handlers.onSessionEnded?.())
  const handleConnectError = useEffectEvent((error: Error) => handlers.onConnectError?.(error))

  useEffect(() => {
    const socket = acquireSocialSocket()
    const onConnect = () => handleConnect()
    const onConnectError = (error: Error) => handleConnectError(error)
    const onChange = ({ notice }: { notice: SocialNotice | null }) => handleChange(notice)
    const onMessage = (notice: MessageNotice) => handleMessage(notice)
    const onPresence = (change: PresenceChange) => handlePresence(change)
    const onCallStarted = (invite: CallInvite) => handleCallStarted(invite)
    const onCallChanged = (change: CallChange) => handleCallChanged(change)
    const onSessionEnded = () => handleSessionEnded()

    socket.on("connect", onConnect)
    socket.on("connect_error", onConnectError)
    socket.on("social:changed", onChange)
    socket.on("social:message", onMessage)
    socket.on("presence:changed", onPresence)
    socket.on("call:started", onCallStarted)
    socket.on("call:changed", onCallChanged)
    socket.on("session:ended", onSessionEnded)
    // Connexion partagée déjà ouverte par un autre composant : on charge tout de suite.
    if (socket.connected) handleConnect()

    return () => {
      socket.off("connect", onConnect)
      socket.off("connect_error", onConnectError)
      socket.off("social:changed", onChange)
      socket.off("social:message", onMessage)
      socket.off("presence:changed", onPresence)
      socket.off("call:started", onCallStarted)
      socket.off("call:changed", onCallChanged)
      socket.off("session:ended", onSessionEnded)
      releaseSocialSocket()
    }
  }, [])
}
