import type { CallSummary } from "@/features/call/types"
import type { ReactionEmoji } from "./lib/config"

/** État d'envoi local d'un message (côté expéditeur). */
export type SendStatus = "sending" | "sent" | "failed"

/** État affiché d'un message : son envoi, puis sa réception et sa lecture par les autres. */
export type MessageStatus = SendStatus | "delivered" | "read"

/** `connecting` : première connexion ; `reconnecting` : après une perte de connexion. */
export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"

export interface ChatUser {
  id: string
  name: string
  avatarUrl?: string
}

/** Métadonnées d'un message vocal, mesurées pendant l'enregistrement. */
export interface VoiceMetadata {
  durationMs: number
  /** Amplitudes de 0 à 100, une par barre affichée. */
  waveform: number[]
}

/** Métadonnées d'une image, mesurées avant l'envoi. */
export interface ImageMetadata {
  width: number
  height: number
  /** Couleur dominante, `#rrggbb`, affichée pendant le chargement. */
  color: string
}

export interface Attachment {
  id: string
  name: string
  mimeType: string
  /** Taille en octets. */
  size: number
  /** Chemin relatif à l'API, ex. `/attachments/<id>`. */
  url: string
  /** Présent pour un message vocal. */
  voice?: VoiceMetadata
  /** Présent pour une image affichable. */
  image?: ImageMetadata
}

/** Message tel qu'il est transmis par le serveur. */
export interface ServerMessage {
  id: string
  /** Numéro d'ordre attribué par le serveur (1, 2, 3…), base des accusés de lecture. */
  seq: number
  author: ChatUser
  /** Peut être vide si le message ne contient que des pièces jointes. */
  content: string
  attachments: Attachment[]
  /** Date ISO 8601, fixée par le serveur. */
  createdAt: string
  /** Date ISO 8601 à laquelle le message disparaît, partout (une heure après l'envoi). */
  expiresAt: string
  /** Participants ayant écouté le message vocal (hors auteur). */
  listenedBy: ChatUser[]
  /** Jusqu'où chaque participant a écouté le vocal, même partiellement. */
  listenProgress: ListenProgress[]
  /** Une réaction au plus par participant. */
  reactions: Reaction[]
  /** Trace d'un direct terminé (message déposé par le serveur, au nom de celui qui l'a lancé). */
  call?: CallSummary
}

export interface Reaction {
  user: ChatUser
  emoji: ReactionEmoji
}

/** Part d'un vocal déjà entendue par un participant (ne recule jamais). */
export interface ListenProgress {
  user: ChatUser
  /** Entier de 0 à 100. */
  percent: number
}

/** Ce qu'un participant est en train de faire. */
export type UserActivity = "typing" | "recording"

export interface ActiveUser {
  user: ChatUser
  activity: UserActivity
}

/** Participant en train d'écouter un vocal, à l'instant même. */
export interface LiveListener {
  user: ChatUser
  messageId: string
}

/** Message affiché : enrichi du statut d'envoi, propre au client. */
export interface ChatMessage extends Omit<ServerMessage, "seq"> {
  /** Absent tant que le serveur n'a pas confirmé le message. */
  seq?: number
  status: SendStatus
}

/**
 * Accusé d'un utilisateur, sous forme de curseurs : les messages dont le `seq`
 * est ≤ `deliveredSeq` ont été reçus par son navigateur, ceux ≤ `readSeq` ont
 * été affichés à son écran.
 */
export interface ReadReceipt {
  user: ChatUser
  deliveredSeq: number
  readSeq: number
}

/** Conversation à ouvrir : le salon, un ami ou un groupe (le serveur vérifie l'accès). */
export type ConversationRef =
  | { type: "salon" }
  | { type: "direct"; userId: string }
  | { type: "group"; groupId: string }

/** Ce que le serveur dit de la conversation ouverte. */
export interface ConversationInfo {
  type: ConversationRef["type"]
  title: string
}

/** Pourquoi la conversation n'est pas (ou plus) accessible. */
export type ConversationUnavailableReason = "forbidden" | "closed"
