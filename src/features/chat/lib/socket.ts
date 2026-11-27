import { io, type Socket } from "socket.io-client"
import type {
  CallJoinAck,
  CallMedia,
  CallParticipant,
  CallReaction,
  CallSignal,
} from "@/features/call/types"
import type {
  ChatUser,
  ConversationInfo,
  ConversationRef,
  ListenProgress,
  Reaction,
  ReadReceipt,
  ReplyRef,
  ServerMessage,
  UserActivity,
  ViewOnceFile,
} from "../types"
import type { PresenceChange } from "@/features/social/types"
import { API_URL, type ReactionEmoji } from "./config"

export type SendMessageAck =
  | { ok: true; message: ServerMessage }
  | { ok: false; error: string }

/** Ouverture d'un message à vue unique : ses fichiers, pour cette fois seulement. */
export type ViewOnceOpenAck =
  | { ok: true; files: ViewOnceFile[] }
  | { ok: false; error: string }

/** Réponse à une action sur un message (modification, suppression…). */
export type MessageActionAck = { ok: true } | { ok: false; error: string }

/**
 * Réponse à une demande de parole en direct (talkie-walkie). Refusée, le
 * vocal part simplement comme d'habitude : personne pour écouter (`alone`),
 * quelqu'un parle déjà (`busy`), ou vocal interdit ici.
 */
export type TalkStartAck =
  | { ok: true; listeners: ChatUser[] }
  | { ok: false; reason: "alone" }
  | { ok: false; reason: "busy"; speaker: ChatUser }
  | { ok: false; reason: "forbidden" | "invalid"; error: string }

/** Contrat Socket.io — à garder synchronisé avec le serveur (`sse/src/chat/chat.types.ts`). */
interface ServerToClientEvents {
  /** Conversation ouverte (accès vérifié), juste avant son historique. */
  "conversation:ready": (conversation: ConversationInfo) => void
  /** Le groupe a changé : nom, photo, ou vos droits. */
  "conversation:updated": (conversation: ConversationInfo) => void
  /** Accès retiré (ami retiré, groupe quitté) : le serveur ferme la connexion. */
  "conversation:closed": () => void
  /** Toutes les sessions de l'utilisateur ont été fermées : le serveur ferme la connexion. */
  "session:ended": () => void
  "chat:history": (messages: ServerMessage[]) => void
  "message:new": (message: ServerMessage) => void
  /** Son auteur a modifié un message (texte corrigé, pièce jointe retirée). */
  "message:updated": (message: ServerMessage) => void
  /** Son auteur a retiré un message que personne n'avait vu. */
  "message:unsent": (event: { messageId: string }) => void
  /** Un modérateur du groupe a supprimé un message. */
  "message:deleted": (event: { messageId: string; deletedBy: ChatUser }) => void
  /** Groupe : qui a la conversation ouverte en ce moment. */
  "users:online": (users: ChatUser[]) => void
  /** Conversation privée : présence de l'ami dans l'application, à l'ouverture puis à chaque changement. */
  "friend:presence": (presence: PresenceChange) => void
  /** Tous les accusés à la connexion, puis uniquement ceux qui changent. */
  "receipts:update": (receipts: ReadReceipt[]) => void
  /** Un participant écrit, enregistre un vocal, ou s'arrête (`null`). */
  activity: (event: { user: ChatUser; activity: UserActivity | null }) => void
  /** Un participant a écouté un message vocal. */
  "voice:listened": (event: { messageId: string; user: ChatUser }) => void
  /** Un participant écoute un vocal en ce moment, ou s'arrête (`null`). */
  "voice:listening": (event: { messageId: string | null; user: ChatUser }) => void
  /** Un participant a avancé dans l'écoute d'un vocal. */
  "voice:progress": (event: { messageId: string } & ListenProgress) => void
  /** Les réactions d'un message ont changé. */
  "message:reactions": (event: { messageId: string; reactions: Reaction[] }) => void
  /** Un destinataire a ouvert un message à vue unique. */
  "view-once:opened": (event: { messageId: string; user: ChatUser }) => void
  /** Participants de l'appel, à la connexion puis à chaque changement. */
  "call:participants": (participants: CallParticipant[]) => void
  /** Appel entre amis terminé par l'autre (raccroché, refusé, sans réponse). */
  "call:ended": () => void
  /** Message WebRTC d'un autre participant (`peerId` : l'expéditeur). */
  "call:signal": (signal: CallSignal) => void
  /** Réaction envoyée pendant le direct. */
  "call:reaction": (reaction: CallReaction) => void
  /** Talkie-walkie : quelqu'un prend la parole en direct (`id` : celui du vocal qui suivra). */
  "talkie:started": (event: { id: string; user: ChatUser }) => void
  /** Un morceau de sa voix (PCM 16 bits, 16 kHz, mono). */
  "talkie:chunk": (event: { id: string; audio: ArrayBuffer }) => void
  /** Il a relâché le micro (`cancelled` : vocal annulé) ; reçu aussi par l'orateur. */
  "talkie:ended": (event: { id: string; user: ChatUser; cancelled: boolean }) => void
}

interface ClientToServerEvents {
  "message:send": (
    payload: {
      id: string
      content: string
      attachmentIds: string[]
      viewOnce?: boolean
      replyTo?: ReplyRef
    },
    ack: (response: SendMessageAck) => void
  ) => void
  /** Ouvre un message à vue unique (une seule fois). */
  "view-once:open": (messageId: string, ack: (response: ViewOnceOpenAck) => void) => void
  /** Supprime un message pour tous (propriétaire et administrateurs d'un groupe). */
  "message:delete": (messageId: string, ack: (response: MessageActionAck) => void) => void
  /** L'auteur corrige son message, tant que personne d'autre ne l'a vu. */
  "message:edit": (
    payload: { messageId: string; content: string },
    ack: (response: MessageActionAck) => void
  ) => void
  /** L'auteur retire son message, tant que personne d'autre ne l'a vu. */
  "message:unsend": (messageId: string, ack: (response: MessageActionAck) => void) => void
  /** L'auteur retire une pièce jointe de son message, aux mêmes conditions. */
  "message:remove-attachment": (
    payload: { messageId: string; attachmentId: string },
    ack: (response: MessageActionAck) => void
  ) => void
  activity: (activity: UserActivity | null) => void
  /** Le message vocal `messageId` a été écouté. */
  "voice:listened": (messageId: string) => void
  /** Le vocal `messageId` est en cours d'écoute, ou plus rien (`null`). */
  "voice:listening": (messageId: string | null) => void
  /** `percent` % du vocal `messageId` ont été écoutés (entier de 0 à 100). */
  "voice:progress": (payload: { messageId: string; percent: number }) => void
  /** Réagit à un message, ou retire sa réaction (`null`) ; `atMs` : sur un moment de son vocal. */
  "message:react": (payload: {
    messageId: string
    emoji: ReactionEmoji | null
    atMs?: number
  }) => void
  /** Rejoint le direct ; la réponse liste les participants à qui se connecter. */
  "call:join": (media: CallMedia, ack: (response: CallJoinAck) => void) => void
  /** Quitte le direct ; entre amis, raccroche (l'appel prend fin pour les deux). */
  "call:leave": () => void
  /** Refuse l'appel d'un ami qui sonne. */
  "call:decline": () => void
  /** Micro coupé ou rétabli, caméra allumée ou éteinte. */
  "call:media": (media: CallMedia) => void
  /** Message WebRTC pour un autre participant (`peerId` : le destinataire). */
  "call:signal": (signal: CallSignal) => void
  "call:react": (emoji: ReactionEmoji) => void
  /** Demande la parole en direct pour le vocal `id`. */
  "talkie:start": (payload: { id: string }, ack: (response: TalkStartAck) => void) => void
  /** Un morceau de voix (PCM 16 bits, 16 kHz, mono). */
  "talkie:chunk": (audio: ArrayBuffer) => void
  /** Rend la parole (`cancelled` : le vocal ne suivra pas). */
  "talkie:end": (payload: { cancelled: boolean }) => void
  /** Tous les messages jusqu'à `seq` inclus ont été reçus. */
  "messages:delivered": (seq: number) => void
  /** Tous les messages jusqu'à `seq` inclus ont été vus à l'écran. */
  "messages:read": (seq: number) => void
}

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/**
 * Connexion à une conversation. Le cookie de session accompagne la poignée de
 * main (`withCredentials`) : le serveur en déduit l'utilisateur, puis vérifie
 * son accès à `conversation` avant d'accepter.
 *
 * `forceNew` : chaque conversation a sa propre connexion, jamais réutilisée
 * pour une autre (elle porte la conversation dans sa poignée de main).
 */
export function createChatSocket(conversation: ConversationRef): ChatSocket {
  return io(API_URL, {
    withCredentials: true,
    autoConnect: false,
    forceNew: true,
    auth: { conversation },
  })
}

type ChatSocketHandlers = Partial<ServerToClientEvents> & {
  connect?: () => void
  disconnect?: (reason: Socket.DisconnectReason) => void
  connect_error?: (error: Error) => void
}

/**
 * Attache des écouteurs à la connexion et renvoie de quoi détacher ceux-là, et
 * seulement eux : chat et direct partagent la même connexion.
 */
export function listen(socket: ChatSocket, handlers: ChatSocketHandlers) {
  // Les surcharges typées de `on` / `off` ne se prêtent pas à une boucle ;
  // le typage est garanti par `ChatSocketHandlers`.
  const entries = Object.entries(handlers) as [never, never][]
  for (const [event, handler] of entries) socket.on(event, handler)
  return () => {
    for (const [event, handler] of entries) socket.off(event, handler)
  }
}
