import type {
  ChatMessage,
  ChatUser,
  MessageStatus,
  ReadReceipt,
} from "../types"
import { formatNameList } from "./format"

/** Statut d'un message envoyé, vu par son auteur. */
export interface MessageReceipt {
  status: MessageStatus
  /** Participants ayant lu le message. */
  readBy: ChatUser[]
  /** Participants l'ayant reçu, mais pas encore lu. */
  deliveredTo: ChatUser[]
}

type SequencedMessage = Pick<ChatMessage, "author" | "seq">

/** Remplace les accusés mis à jour (un seul par utilisateur). */
export function mergeReceipts(current: ReadReceipt[], updates: ReadReceipt[]) {
  const byUser = new Map(current.map((receipt) => [receipt.user.id, receipt]))
  for (const receipt of updates) byUser.set(receipt.user.id, receipt)
  return [...byUser.values()]
}

/**
 * Dans une conversation de groupe, un message est « distribué » dès qu'un autre
 * participant l'a reçu, et « lu » dès qu'un autre participant l'a vu.
 */
export function getMessageReceipt(
  message: ChatMessage,
  receipts: ReadReceipt[]
): MessageReceipt {
  const { seq, status, author } = message
  if (status !== "sent" || seq === undefined) {
    return { status, readBy: [], deliveredTo: [] }
  }

  const readBy: ChatUser[] = []
  const deliveredTo: ChatUser[] = []

  for (const { user, deliveredSeq, readSeq } of receipts) {
    if (user.id === author.id) continue
    if (readSeq >= seq) readBy.push(user)
    else if (deliveredSeq >= seq) deliveredTo.push(user)
  }

  return {
    status: readBy.length > 0 ? "read" : deliveredTo.length > 0 ? "delivered" : "sent",
    readBy,
    deliveredTo,
  }
}

/**
 * Vu par quelqu'un d'autre que son auteur : lu à l'écran, ou vocal écouté
 * (même en partie). Il ne peut alors plus être modifié ni supprimé par lui
 * (même règle que le serveur, qui tranche).
 */
export function isSeenByOthers(message: ChatMessage, receipts: ReadReceipt[]) {
  if (message.listenedBy.length > 0 || message.listenProgress.length > 0) return true
  const { seq, author } = message
  return (
    seq !== undefined &&
    receipts.some((receipt) => receipt.user.id !== author.id && receipt.readSeq >= seq)
  )
}

/** Libellé court : « Envoyé », « Distribué », « Lu par Alice et Bob »… */
export function getReceiptLabel({ status, readBy }: MessageReceipt) {
  switch (status) {
    case "sending":
      return "Envoi…"
    case "failed":
      return "Échec de l'envoi"
    case "sent":
      return "Envoyé"
    case "delivered":
      return "Distribué"
    case "read":
      return `Vu par ${formatNameList(readBy.map((user) => user.name))}`
  }
}

/** `seq` du dernier message reçu d'un autre participant (0 si aucun). */
export function getLatestIncomingSeq(messages: SequencedMessage[], userId: string) {
  for (let index = messages.length - 1; index >= 0; index--) {
    const { author, seq } = messages[index]
    if (author.id !== userId && seq !== undefined) return seq
  }
  return 0
}

/** Messages d'autres participants pas encore lus par l'utilisateur. */
export function countUnread(
  messages: SequencedMessage[],
  userId: string,
  readSeq: number
) {
  return messages.filter(
    ({ author, seq }) => author.id !== userId && seq !== undefined && seq > readSeq
  ).length
}
