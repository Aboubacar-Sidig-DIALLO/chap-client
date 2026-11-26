import type { ReactionEmoji } from "@/features/chat/lib/config"
import type { ChatUser } from "@/features/chat/types"

/** Contrat partagé avec le serveur (`sse/src/call/call.types.ts`). */

/** Ce qu'un participant partage : son micro (non coupé) et sa caméra. */
export interface CallMedia {
  audio: boolean
  video: boolean
}

/** Participant au direct. `peerId` désigne sa connexion (un onglet). */
export interface CallParticipant extends CallMedia {
  peerId: string
  user: ChatUser
  /** Date ISO 8601 d'arrivée dans le direct. */
  joinedAt: string
}

/** Trace d'un direct terminé, déposée dans la conversation par le serveur. */
export interface CallSummary {
  /** Dates ISO 8601. */
  startedAt: string
  endedAt: string
  /** Groupe : durée du direct. Entre amis : temps de conversation depuis la réponse (0 sans réponse). */
  durationMs: number
  /** Tous ceux qui y sont passés, par ordre d'arrivée (le premier l'a lancé). */
  participants: ChatUser[]
  /** Au moins une caméra s'est allumée. */
  hadVideo: boolean
  /** Entre amis : l'appel a été refusé par celui qu'on appelait. */
  declined: boolean
}

/** Message WebRTC échangé entre deux participants, via le serveur. */
export interface SignalData {
  description?: RTCSessionDescriptionInit
  /** `null` : plus aucun candidat à venir. */
  candidate?: RTCIceCandidateInit | null
}

export interface CallSignal {
  peerId: string
  data: SignalData
}

export interface CallReaction {
  peerId: string
  emoji: ReactionEmoji
}

export type CallJoinAck =
  | { ok: true; participants: CallParticipant[] }
  | { ok: false; error: string }
