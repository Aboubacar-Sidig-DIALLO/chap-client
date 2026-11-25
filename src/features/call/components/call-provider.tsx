"use client"

import { createContext, use, useEffect, useState, useSyncExternalStore } from "react"
import type { ChatSocket } from "@/features/chat/lib/socket"
import { CallSession, type CallSnapshot } from "../lib/call-session"

interface CallContextValue {
  call: CallSnapshot
  session: CallSession
  /** Vous êtes dans le direct (ou en train d'y entrer). */
  isInCall: boolean
  /** Scène plein écran ; sinon, mini-direct flottant au-dessus de la conversation. */
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
  /** Entre dans le direct (ou le lance) et ouvre la scène. */
  join: () => void
}

const CallContext = createContext<CallContextValue | null>(null)

export function useCall() {
  const context = use(CallContext)
  if (!context) throw new Error("useCall doit être utilisé dans <CallProvider>")
  return context
}

interface CallProviderProps {
  /** La connexion du chat, qui porte aussi la signalisation du direct. */
  socket: ChatSocket
  children: React.ReactNode
}

/** Le direct de la conversation, pour toute la page (en-tête, scène, mini-direct). */
export function CallProvider({ socket, children }: CallProviderProps) {
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
        isInCall: call.status !== "idle",
        isExpanded,
        setIsExpanded,
        join,
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
