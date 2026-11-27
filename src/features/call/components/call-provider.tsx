"use client"

import { createContext, use, useEffect, useState, useSyncExternalStore } from "react"
import { CallSession, type CallSnapshot } from "../lib/call-session"
import type { CallSocket } from "../lib/call-socket"

/** Ce que peuvent faire le propriétaire et les administrateurs d'un groupe pendant son appel. */
export interface GuestControls {
  /** Ouvre l'invitation d'une personne extérieure (lien à usage unique). */
  onInvite: () => void
  /** Retire un invité de l'appel ; renvoie l'erreur à afficher, ou `null`. */
  onRemove: (peerId: string) => Promise<string | null>
}

interface CallContextValue {
  call: CallSnapshot
  session: CallSession
  /**
   * Appel entre deux amis : il sonne chez l'autre, qui répond ou refuse, et
   * prend fin pour les deux dès que l'un raccroche. Sinon, direct de groupe
   * ouvert, que chacun rejoint ou quitte librement.
   */
  isDirect: boolean
  /** Nom de l'ami ou du groupe. */
  title: string
  currentUserId: string
  /** Vous êtes dans le direct (ou en train d'y entrer). */
  isInCall: boolean
  /** Scène plein écran ; sinon, mini-direct flottant au-dessus de la conversation. */
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
  /** Lance l'appel, y répond ou entre dans le direct, et ouvre la scène. */
  join: () => void
  /**
   * Vous êtes un invité, sans compte : l'appel est tout ce que vous voyez
   * (pas de conversation à laquelle revenir).
   */
  isGuest: boolean
  /** Propriétaire ou administrateur dans un appel de groupe ; `null` sinon. */
  guestControls: GuestControls | null
}

const CallContext = createContext<CallContextValue | null>(null)

export function useCall() {
  const context = use(CallContext)
  if (!context) throw new Error("useCall doit être utilisé dans <CallProvider>")
  return context
}

interface CallProviderProps {
  /** La connexion qui porte la signalisation : celle du chat, ou celle d'un invité. */
  socket: CallSocket
  isDirect: boolean
  title: string
  currentUserId: string
  isGuest?: boolean
  guestControls?: GuestControls | null
  children: React.ReactNode
}

/** L'appel de la conversation, pour toute la page (en-tête, scène, mini-appel). */
export function CallProvider({
  socket,
  isDirect,
  title,
  currentUserId,
  isGuest = false,
  guestControls = null,
  children,
}: CallProviderProps) {
  const [session] = useState(() => new CallSession(socket))
  const [isExpanded, setIsExpanded] = useState(true)
  const call = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot)

  useEffect(() => session.attach(), [session])

  function join() {
    setIsExpanded(true)
    void session.join()
  }

  return (
    <CallContext
      value={{
        call,
        session,
        isDirect,
        title,
        currentUserId,
        isInCall: call.status !== "idle",
        isExpanded,
        setIsExpanded,
        join,
        isGuest,
        guestControls,
      }}
    >
      {children}
      <RemoteAudio streams={call.remoteStreams} />
    </CallContext>
  )
}

/** Le son des autres participants, joué que la scène soit ouverte ou réduite. */
function RemoteAudio({ streams }: { streams: ReadonlyMap<string, MediaStream> }) {
  return [...streams].map(([peerId, stream]) => (
    <audio
      key={peerId}
      autoPlay
      ref={(element) => {
        if (element && element.srcObject !== stream) element.srcObject = stream
      }}
    />
  ))
}
