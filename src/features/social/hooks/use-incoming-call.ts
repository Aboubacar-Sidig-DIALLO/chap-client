"use client"

import { useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { conversationHref } from "../lib/conversation"
import type { CallInvite, ConversationTarget } from "../types"
import { useSocialEvents } from "./use-social-events"

/** Appel qui sonne ; `id` distingue deux appels successifs de la même conversation. */
export interface IncomingCall extends CallInvite {
  id: number
}

function sameConversation(a: ConversationTarget, b: ConversationTarget) {
  return a.type === "direct"
    ? b.type === "direct" && a.userId === b.userId
    : b.type === "group" && a.groupId === b.groupId
}

/**
 * L'appel qui sonne pour l'utilisateur connecté, où qu'il soit dans l'application.
 * Il cesse de sonner quand l'appel se termine, quand l'utilisateur le rejoint
 * (ici ou depuis un autre appareil), ou quand il ouvre la conversation, où le
 * bandeau du direct prend le relais.
 */
export function useIncomingCall(currentUserId: string) {
  const pathname = usePathname()
  const [incoming, setIncoming] = useState<IncomingCall | null>(null)
  const countRef = useRef(0)

  useSocialEvents({
    onCallStarted: (invite) => setIncoming({ id: ++countRef.current, ...invite }),
    onCallChanged: ({ conversation, call }) => {
      setIncoming((current) => {
        if (!current || !sameConversation(current.conversation, conversation)) return current
        const hasJoined = call?.participants.some((user) => user.id === currentUserId)
        return call && !hasJoined ? current : null
      })
    },
  })

  const isInConversation = incoming !== null && pathname === conversationHref(incoming.conversation)

  return {
    incoming: isInConversation ? null : incoming,
    dismiss: () => setIncoming(null),
  }
}
