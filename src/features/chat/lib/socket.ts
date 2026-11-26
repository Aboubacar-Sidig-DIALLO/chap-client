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
  ServerMessage,
  UserActivity,
} from "../types"
import type { PresenceChange } from "@/features/social/types"
import { API_URL, type ReactionEmoji } from "./config"

export type SendMessageAck =
  | { ok: true; message: ServerMessage }
  | { ok: false; error: string }

/** Contrat Socket.io — à garder synchronisé avec le serveur (`sse/src/chat/chat.types.ts`). */
interface ServerToClientEvents {
  /** Conversation ouverte (accès vérifié), juste avant son historique. */
  "conversation:ready": (conversation: ConversationInfo) => void
  /** Le groupe a changé de nom ou de photo. */
  "conversation:updated": (conversation: ConversationInfo) => void
  /** Accès retiré (ami retiré, groupe quitté) : le serveur ferme la connexion. */
  "conversation:closed": () => void
  /** Toutes les sessions de l'utilisateur ont été fermées : le serveur ferme la connexion. */
  "session:ended": () => void
  "chat:history": (messages: ServerMessage[]) => void
  "message:new": (message: ServerMessage) => void
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
  /** Participants de l'appel, à la connexion puis à chaque changement. */
  "call:participants": (participants: CallParticipant[]) => void
  /** Appel entre amis terminé par l'autre (raccroché, refusé, sans réponse). */
  "call:ended": () => void
  /** Message WebRTC d'un autre participant (`peerId` : l'expéditeur). */
  "call:signal": (signal: CallSignal) => void
  /** Réaction envoyée pendant le direct. */
  "call:reaction": (reaction: CallReaction) => void
}

interface ClientToServerEvents {
  "message:send": (
    payload: { id: string; content: string; attachmentIds: string[] },
    ack: (response: SendMessageAck) => void
  ) => void
  activity: (activity: UserActivity | null) => void
  /** Le message vocal `messageId` a été écouté. */
  "voice:listened": (messageId: string) => void
  /** Le vocal `messageId` est en cours d'écoute, ou plus rien (`null`). */
  "voice:listening": (messageId: string | null) => void
  /** `percent` % du vocal `messageId` ont été écoutés (entier de 0 à 100). */
  "voice:progress": (payload: { messageId: string; percent: number }) => void
  /** Réagit à un message, ou retire sa réaction (`null`). */
  "message:react": (payload: { messageId: string; emoji: ReactionEmoji | null }) => void
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
