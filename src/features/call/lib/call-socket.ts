import type { Socket } from "socket.io-client"
import type { ReactionEmoji } from "@/features/chat/lib/config"
import type { CallJoinAck, CallMedia, CallParticipant, CallReaction, CallSignal } from "../types"

/**
 * Événements de l'appel, communs à la connexion du chat (membres) et à celle
 * des invités d'un appel de groupe — à garder synchronisés avec le serveur
 * (`sse/src/call/call.types.ts`).
 */
export interface CallServerEvents {
  /** Participants de l'appel, à la connexion puis à chaque changement (diffusé à tous). */
  "call:participants": (participants: CallParticipant[]) => void
  /** L'appel a pris fin pour vous (entre amis : l'autre a raccroché ; groupe : plus aucun membre). */
  "call:ended": () => void
  /** Message WebRTC d'un autre participant (`peerId` : l'expéditeur). */
  "call:signal": (signal: CallSignal) => void
  /** Réaction envoyée pendant l'appel. */
  "call:reaction": (reaction: CallReaction) => void
}

export interface CallClientEvents {
  /** Rejoint l'appel ; la réponse liste les participants à qui se connecter. */
  "call:join": (media: CallMedia, ack: (response: CallJoinAck) => void) => void
  /** Quitte l'appel ; entre amis, raccroche (l'appel prend fin pour les deux). */
  "call:leave": () => void
  /** Refuse l'appel d'un ami qui sonne (sans effet pour un invité). */
  "call:decline": () => void
  /** Micro coupé ou rétabli, caméra allumée ou éteinte. */
  "call:media": (media: CallMedia) => void
  /** Message WebRTC pour un autre participant (`peerId` : le destinataire). */
  "call:signal": (signal: CallSignal) => void
  "call:react": (emoji: ReactionEmoji) => void
}

/** Une connexion qui porte un appel : celle du chat, ou celle d'un invité. */
export type CallSocket = Socket<CallServerEvents, CallClientEvents>
