/** Contrat de l'API sociale — à garder synchronisé avec le serveur (`sse/src/social/social.types.ts`). */

/** Ce qu'on montre d'un autre utilisateur (jamais son email). */
export interface PublicUser {
  id: string
  name: string
  image: string | null
}

/** Lien entre l'utilisateur connecté et quelqu'un d'autre. */
export type Relation =
  | "none"
  /** Amis. */
  | "friend"
  /** Il m'a envoyé une demande. */
  | "incoming"
  /** Je lui ai envoyé une demande. */
  | "outgoing"

export interface SearchResult extends PublicUser {
  relation: Relation
}

/** Présence d'un ami : en ligne, ou depuis quand il ne l'est plus. */
export interface Presence {
  online: boolean
  /** Date ISO 8601 de son dernier départ ; `null` s'il est en ligne ou inconnu. */
  lastSeenAt: string | null
}

/** Appel en cours dans une conversation privée ou de groupe. */
export interface OngoingCall {
  /** Date ISO 8601 du début de l'appel. */
  startedAt: string
  /** Qui y est en ce moment, par ordre d'arrivée. */
  participants: PublicUser[]
}

/** Un ami, avec sa présence. */
export interface Friend extends PublicUser {
  presence: Presence
  /** Appel en cours dans votre conversation avec lui. */
  call: OngoingCall | null
}

/** Un ami arrive ou quitte l'application. */
export interface PresenceChange extends Presence {
  userId: string
}

export interface FriendsOverview {
  friends: Friend[]
  incoming: PublicUser[]
  outgoing: PublicUser[]
}

export interface GroupSummary {
  id: string
  name: string
  /** Date ISO 8601. */
  createdAt: string
  members: PublicUser[]
  /** Appel en cours dans le groupe. */
  call: OngoingCall | null
}

/** Événement annoncé à l'utilisateur, en plus de la mise à jour de ses listes. */
export type SocialNotice =
  | { type: "friend-request"; user: PublicUser }
  | { type: "friend-accepted"; user: PublicUser }
  | { type: "group-added"; user: PublicUser; groupName: string }

/** Événements Socket.io de l'espace `/social` (serveur → client). */
export interface SocialServerEvents {
  /** Amis, demandes ou groupes modifiés : recharger les listes. */
  "social:changed": (event: { notice: SocialNotice | null }) => void
  /** Nouveau message dans une conversation privée ou de groupe (jamais son contenu). */
  "social:message": (event: MessageNotice) => void
  /** Un ami arrive ou quitte l'application. */
  "presence:changed": (event: PresenceChange) => void
  /** Un appel commence : il sonne chez les autres membres. */
  "call:started": (event: CallInvite) => void
  /** Un appel a commencé, changé de participants ou pris fin (`call: null`). */
  "call:changed": (event: CallChange) => void
  /** Toutes vos sessions ont été fermées (adresse changée, compte supprimé) : la connexion va se fermer. */
  "session:ended": () => void
}

/** Événements Socket.io de l'espace `/social` (client → serveur). */
export interface SocialClientEvents {
  /** Refuse l'appel de cet ami : il cesse aussitôt de sonner, des deux côtés. */
  "call:decline": (payload: { userId: string }) => void
}

/** Invitation à rejoindre un appel qui vient de commencer. */
export interface CallInvite {
  conversation: ConversationTarget
  startedBy: PublicUser
}

export interface CallChange {
  conversation: ConversationTarget
  call: OngoingCall | null
}

/** Conversation vue depuis le destinataire : l'ami qui écrit, ou le groupe. */
export type ConversationTarget =
  | { type: "direct"; userId: string }
  | { type: "group"; groupId: string; groupName: string }

/** Annonce d'un nouveau message, sans son contenu. */
export interface MessageNotice {
  conversation: ConversationTarget
  from: PublicUser
}

/** Clé d'une conversation pour compter ses messages non lus. */
export function conversationKey(
  target: { type: "direct"; userId: string } | { type: "group"; groupId: string }
) {
  return target.type === "direct" ? `direct:${target.userId}` : `group:${target.groupId}`
}
