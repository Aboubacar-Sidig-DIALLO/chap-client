import type { CallSnapshot } from "./call-session"
import type { CallParticipant } from "../types"

/** Début du direct : l'arrivée du premier participant encore présent. */
export function getLiveSince(participants: CallParticipant[]): string | null {
  if (participants.length === 0) return null
  return participants.reduce((earliest, participant) =>
    participant.joinedAt < earliest.joinedAt ? participant : earliest
  ).joinedAt
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
