"use client"

import { SessionGate } from "@/features/auth/components/session-gate"
import { authClient } from "@/lib/auth-client"
import type { ConversationRef } from "../types"
import { ChatRoom } from "./chat-room"

/**
 * Une conversation (ami ou groupe), réservée aux utilisateurs connectés ;
 * l'identité vient de la session.
 */
interface ChatAppProps {
  conversation: ConversationRef
  /** Rejoindre l'appel en cours dès l'ouverture (voir `ChatRoom`). */
  autoJoinCall?: boolean
  onAutoJoinHandled?: () => void
}

export function ChatApp({ conversation, autoJoinCall, onAutoJoinHandled }: ChatAppProps) {
  return (
    <SessionGate>
      {({ id, name }) => (
        // `key` : nouvelle connexion et état vierge si l'utilisateur change.
        // Session refusée par le serveur : on se déconnecte, `SessionGate` renvoie à la connexion.
        <ChatRoom
          key={id}
          currentUser={{ id, name }}
          conversation={conversation}
          onSessionExpired={() => void authClient.signOut()}
          autoJoinCall={autoJoinCall}
          onAutoJoinHandled={onAutoJoinHandled}
        />
      )}
    </SessionGate>
  )
}
