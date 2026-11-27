"use client"

import { createContext, use } from "react"
import { isSeenByOthers } from "../lib/receipts"
import type { Attachment, ChatMessage, ReadReceipt } from "../types"

/** Chaque action renvoie l'erreur à afficher, ou `null` si elle a réussi. */
type MessageRequest = Promise<string | null>

interface MessageActionsValue {
  currentUserId: string
  /** Accusés de lecture : un message vu par un autre ne peut plus changer. */
  receipts: ReadReceipt[]
  /** Propriétaire ou administrateur du groupe : supprime n'importe quel message. */
  canModerate: boolean
  edit: (messageId: string, content: string) => MessageRequest
  unsend: (messageId: string) => MessageRequest
  removeAttachment: (messageId: string, attachmentId: string) => MessageRequest
  moderate: (messageId: string) => MessageRequest
}

const MessageActionsContext = createContext<MessageActionsValue | null>(null)

/** Ce qu'on peut faire sur les messages de la conversation, pour toute la liste. */
export function MessageActionsProvider({
  value,
  children,
}: {
  value: MessageActionsValue
  children: React.ReactNode
}) {
  return <MessageActionsContext value={value}>{children}</MessageActionsContext>
}

/**
 * - `unsend` : son auteur le retire ; personne ne l'a vu, il disparaît sans trace.
 * - `moderate` : un modérateur le supprime pour tous ; une mention reste.
 */
export type MessageRemoval = "unsend" | "moderate"

export interface MessageActions {
  /** Encore modifiable par son auteur : personne d'autre ne l'a vu. */
  isChangeable: boolean
  canEdit: boolean
  removal: MessageRemoval | null
  /** Pièces jointes que l'auteur peut retirer une à une (s'il reste autre chose après). */
  removableAttachments: Attachment[]
  edit: (content: string) => MessageRequest
  remove: () => MessageRequest
  removeAttachment: (attachment: Attachment) => MessageRequest
}

/**
 * Les actions permises sur un message. Son auteur le modifie, le supprime ou
 * en retire une pièce jointe tant que personne d'autre ne l'a vu ; un
 * modérateur le supprime à tout moment. Le serveur revérifie chaque demande.
 */
export function useMessageActions(message: ChatMessage): MessageActions | null {
  const context = use(MessageActionsContext)
  if (!context || message.status !== "sent" || message.deletedBy || message.call) return null

  const isOwn = message.author.id === context.currentUserId
  const isChangeable = isOwn && !isSeenByOthers(message, context.receipts)
  const removal: MessageRemoval | null = isChangeable ? "unsend" : context.canModerate ? "moderate" : null
  // Une pièce jointe seule, sans texte : la retirer, c'est supprimer le message.
  const hasOtherContent = message.content !== "" || message.attachments.length > 1

  return {
    isChangeable,
    canEdit: isChangeable && message.content !== "",
    removal,
    removableAttachments: isChangeable && hasOtherContent ? message.attachments : [],
    edit: (content) => context.edit(message.id, content),
    remove: () => (removal === "unsend" ? context.unsend(message.id) : context.moderate(message.id)),
    removeAttachment: (attachment) => context.removeAttachment(message.id, attachment.id),
  }
}
