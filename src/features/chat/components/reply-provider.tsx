"use client"

import { createContext, use, useState } from "react"
import { revealMessage, voiceOf } from "../lib/replies"
import type { ChatMessage, ReplyRef } from "../types"
import { useVoicePlayback } from "./voice-playback"

/** La réponse en préparation : le message cité et, pour un vocal, le moment. */
export interface ReplyDraft {
  message: ChatMessage
  atMs?: number
}

interface ReplyContextValue {
  /** Ses propres messages sont cités comme « Vous ». */
  currentUserId: string
  /** On peut répondre ici (écrire ou parler) ; sinon, rien ne le propose. */
  canReply: boolean
  draft: ReplyDraft | null
  /** Prépare une réponse au message, ou à un moment de son vocal. */
  startReply: (message: ChatMessage, atMs?: number) => void
  cancelReply: () => void
  /** Le message cité, s'il est encore dans la conversation. */
  findMessage: (messageId: string) => ChatMessage | undefined
  /** Ramène au message cité (le fait briller) ; à un moment cité, l'écoute de là. */
  jumpTo: (reply: ReplyRef) => void
}

const ReplyContext = createContext<ReplyContextValue | null>(null)

export function useReply() {
  const context = use(ReplyContext)
  if (!context) throw new Error("useReply doit être utilisé dans <ReplyProvider>")
  return context
}

interface ReplyProviderProps {
  messages: ChatMessage[]
  currentUserId: string
  canReply: boolean
  children: React.ReactNode
}

/**
 * Répondre à un message, ou à un passage précis d'un vocal : la réponse en
 * préparation (partagée par la liste et le compositeur), et le retour au
 * message cité depuis une citation. À placer dans `<VoicePlaybackProvider>`.
 */
export function ReplyProvider({ messages, currentUserId, canReply, children }: ReplyProviderProps) {
  const playback = useVoicePlayback()
  const [pending, setPending] = useState<ReplyRef | null>(null)

  function findMessage(messageId: string) {
    return messages.find((message) => message.id === messageId)
  }

  // Expiré, retiré ou supprimé entre-temps : la réponse en préparation tombe d'elle-même.
  const target = pending ? findMessage(pending.messageId) : undefined
  const draft: ReplyDraft | null =
    canReply && pending && target && !target.deletedBy ? { message: target, atMs: pending.atMs } : null

  function startReply(message: ChatMessage, atMs?: number) {
    const hasMoment = atMs !== undefined && voiceOf(message) !== null
    setPending({ messageId: message.id, ...(hasMoment && { atMs: Math.round(atMs) }) })
  }

  function jumpTo({ messageId, atMs }: ReplyRef) {
    const message = findMessage(messageId)
    if (!message) return
    // Un moment de vocal : on l'écoute de là (son lecteur défile jusqu'à lui).
    const isPlaying = atMs !== undefined && voiceOf(message) !== null && playback.playFrom(messageId, atMs)
    revealMessage(messageId, { scroll: !isPlaying })
  }

  return (
    <ReplyContext
      value={{
        currentUserId,
        canReply,
        draft,
        startReply,
        cancelReply: () => setPending(null),
        findMessage,
        jumpTo,
      }}
    >
      {children}
    </ReplyContext>
  )
}
