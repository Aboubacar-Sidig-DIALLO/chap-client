import type { ChatUser } from "@/features/chat/types"
import type { CallSnapshot } from "./call-session"
import type { CallParticipant } from "../types"

/** « Léa », ou « Paul (invité) » pour une personne extérieure au groupe. */
export function participantName(user: ChatUser) {
  return user.isGuest ? `${user.name} (invité)` : user.name
}

/**
 * Départ du chronomètre. Direct de groupe : l'arrivée du premier participant
 * encore présent. Appel entre amis : la réponse (`null` tant que ça sonne).
 */
export function getLiveSince(participants: CallParticipant[], isDirect: boolean): string | null {
  if (participants.length === 0 || (isDirect && participants.length < 2)) return null
  const joinedAt = participants.map((participant) => participant.joinedAt).sort()
  return isDirect ? joinedAt[joinedAt.length - 1] : joinedAt[0]
}

/** Appel entre amis lancé, en attente de la réponse de l'autre. */
export function isRinging(participants: CallParticipant[], isDirect: boolean) {
  return isDirect && participants.length === 1
}

/** Vous d'abord, puis les autres par ordre d'arrivée. */
export function orderParticipants(participants: CallParticipant[], selfId: string | null) {
  return [...participants].sort((a, b) => {
    if (a.peerId === selfId) return -1
    if (b.peerId === selfId) return 1
    return a.joinedAt.localeCompare(b.joinedAt)
  })
}

/** Des orbes plus petits à mesure que le direct se remplit (diamètre en px). */
export function getOrbSize(count: number) {
  if (count <= 2) return 136
  if (count <= 4) return 112
  return 88
}

/** Le flux à afficher pour un participant : votre caméra, ou ce qu'il envoie. */
export function getParticipantStream(call: CallSnapshot, peerId: string) {
  return peerId === call.selfId ? call.cameraStream : (call.remoteStreams.get(peerId) ?? null)
}
