"use client"

import { createContext, use, useEffect, useEffectEvent, useState, useSyncExternalStore } from "react"
import { useCall } from "@/features/call/components/call-provider"
import { useVoicePlayback } from "@/features/chat/components/voice-playback"
import type { ChatSocket } from "@/features/chat/lib/socket"
import type { ChatUser } from "@/features/chat/types"
import { TalkieSession } from "../lib/talkie-session"
import type { TalkieSnapshot } from "../types"

interface TalkieContextValue extends TalkieSnapshot {
  session: TalkieSession
}

const TalkieContext = createContext<TalkieContextValue | null>(null)

export function useTalkie() {
  const context = use(TalkieContext)
  if (!context) throw new Error("useTalkie doit être utilisé dans <TalkieProvider>")
  return context
}

interface TalkieProviderProps {
  /** La connexion du chat, qui porte aussi le talkie-walkie. */
  socket: ChatSocket
  currentUserId: string
  /** Qui a la conversation ouverte (vous compris) : eux seuls entendent le direct. */
  onlineUsers: ChatUser[]
  children: React.ReactNode
}

/**
 * Le talkie-walkie de la conversation : à placer dans `CallProvider` (en
 * appel, il se met en retrait) et `VoicePlaybackProvider` (une voix en direct
 * met en pause le vocal en cours de lecture).
 */
export function TalkieProvider({ socket, currentUserId, onlineUsers, children }: TalkieProviderProps) {
  const [session] = useState(() => new TalkieSession(socket, currentUserId))
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot)
  const { isInCall } = useCall()
  const playback = useVoicePlayback()

  useEffect(() => session.attach(), [session])
  useEffect(() => session.setOnlineUsers(onlineUsers), [session, onlineUsers])
  useEffect(() => session.setSuppressed(isInCall), [session, isInCall])

  // Quelqu'un vous parle en direct : le vocal en cours de lecture se met en pause.
  const pauseVocal = useEffectEvent(() => {
    if (playback.nowPlaying?.isPlaying) playback.toggleNowPlaying()
  })
  const isHearingLive = snapshot.incoming !== null && !snapshot.isMuted && !snapshot.isSuppressed
  useEffect(() => {
    if (isHearingLive) pauseVocal()
  }, [isHearingLive])

  return <TalkieContext value={{ ...snapshot, session }}>{children}</TalkieContext>
}
