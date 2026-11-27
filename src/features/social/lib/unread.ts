/**
 * Messages non lus de chaque conversation, reçus sur l'accueil. On garde les
 * messages eux-mêmes (et non un simple nombre) : un message retiré, supprimé
 * ou expiré est décompté exactement, sans doublon ni total négatif.
 *
 * Fonctions pures : elles renvoient le même objet quand rien ne change (pas de
 * rendu inutile).
 */

export interface UnreadMessage {
  id: string
  /** Horodatage (ms) auquel le message disparaît, partout. */
  expiresAt: number
}

/** Par conversation (voir `conversationKey`). */
export type UnreadByConversation = Readonly<Record<string, readonly UnreadMessage[]>>

export function countUnread(unread: UnreadByConversation, key: string) {
  return unread[key]?.length ?? 0
}

/** Ajoute un message non lu (ignoré s'il est déjà compté). */
export function addUnread(
  unread: UnreadByConversation,
  key: string,
  message: UnreadMessage
): UnreadByConversation {
  const messages = unread[key] ?? []
  if (messages.some((item) => item.id === message.id)) return unread
  return { ...unread, [key]: [...messages, message] }
}

/** Retire un message (retiré par son auteur ou supprimé) ; sans effet s'il n'était pas compté. */
export function removeUnread(
  unread: UnreadByConversation,
  key: string,
  messageId: string
): UnreadByConversation {
  const messages = unread[key]
  if (!messages?.some((item) => item.id === messageId)) return unread
  return { ...unread, [key]: messages.filter((item) => item.id !== messageId) }
}

/** La conversation est ouverte : tout y est lu. */
export function clearUnread(unread: UnreadByConversation, key: string): UnreadByConversation {
  if (!unread[key]?.length) return unread
  return { ...unread, [key]: [] }
}

/** Oublie les messages expirés : ils ont disparu de la conversation. */
export function withoutExpired(unread: UnreadByConversation, now: number): UnreadByConversation {
  let changed = false
  const next: Record<string, readonly UnreadMessage[]> = {}
  for (const [key, messages] of Object.entries(unread)) {
    const kept = messages.filter((message) => message.expiresAt > now)
    if (kept.length !== messages.length) changed = true
    next[key] = kept
  }
  return changed ? next : unread
}
