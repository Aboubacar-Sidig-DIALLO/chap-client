import type { CallSummary } from "@/features/call/types"
import type { ConversationRights } from "@/features/social/types"
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
  /** Invité d'un appel de groupe, sans compte : présent le temps de l'appel seulement. */
  isGuest?: boolean
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
  /** Le message auquel celui-ci répond (et, pour un vocal, à quel moment). */
  replyTo?: ReplyRef
  /** Trace d'un direct terminé (message déposé par le serveur, au nom de celui qui l'a lancé). */
  call?: CallSummary
  /** Supprimé par un modérateur du groupe : contenu effacé, seule reste cette mention. */
  deletedBy?: ChatUser
  /** Date ISO 8601 de la dernière modification par son auteur. */
  editedAt?: string
  /**
   * Vue unique : ses pièces jointes ne sont jamais diffusées (`attachments`
   * est vide), seulement annoncées ; chaque destinataire les ouvre une fois.
   */
  viewOnce?: ViewOnce
}

/** Genre d'une pièce jointe à vue unique : tout ce qu'on en sait avant de l'ouvrir. */
export type ViewOnceKind = "voice" | "image" | "video" | "file"

export interface ViewOnceItem {
  kind: ViewOnceKind
  /** Durée d'un vocal. */
  durationMs?: number
}

export interface ViewOnce {
  items: ViewOnceItem[]
  /** Destinataires qui l'ont ouvert (et ne peuvent plus le rouvrir). */
  openedBy: ChatUser[]
}

/** Pièce jointe à vue unique remise à l'ouverture, téléchargeable une minute. */
export interface ViewOnceFile {
  kind: ViewOnceKind
  name: string
  mimeType: string
  /** Chemin relatif à l'API : `/attachments/once/<ticket>`. */
  url: string
  /** Durée et forme d'onde d'un vocal. */
  voice?: VoiceMetadata
}

export interface Reaction {
  user: ChatUser
  emoji: ReactionEmoji
  /** Posée sur un moment précis du vocal (ms depuis son début) ; absente : sur tout le message. */
  atMs?: number
}

/**
 * Référence au message cité, jamais une copie : il est retrouvé dans la
 * conversation, et un message retiré ou supprimé ne survit pas dans ses réponses.
 */
export interface ReplyRef {
  messageId: string
  /** Moment précis du vocal cité (ms depuis son début). */
  atMs?: number
}

/** Part d'un vocal déjà entendue par un participant (ne recule jamais). */
export interface ListenProgress {
  user: ChatUser
  /** Entier de 0 à 100. */
  percent: number
}

/** Options d'envoi d'un message. */
export interface SendOptions {
  /** Fixé à l'avance pour un vocal parlé en direct (talkie-walkie). */
  id?: string
  /** Pièces jointes à vue unique : chaque destinataire ne les ouvre qu'une fois. */
  viewOnce?: boolean
  /** Le message auquel on répond (et, pour un vocal, à quel moment). */
  replyTo?: ReplyRef
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

/** Conversation à ouvrir : avec un ami ou d'un groupe (le serveur vérifie l'accès). */
export type ConversationRef =
  | { type: "direct"; userId: string }
  | { type: "group"; groupId: string }

/** Ce que le serveur dit de la conversation ouverte. */
export interface ConversationInfo {
  type: ConversationRef["type"]
  title: string
  /** Photo du groupe, relative à l'API ; `null` sinon. */
  photoUrl: string | null
  /** Ce que l'utilisateur peut y faire (écrire, parler, appeler, modérer). */
  rights: ConversationRights
}

/** Pourquoi la conversation n'est pas (ou plus) accessible. */
export type ConversationUnavailableReason = "forbidden" | "closed"
