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

/**
 * Rôle dans un groupe. Le propriétaire a tous les droits ; les
 * administrateurs ajoutent des membres et suppriment des messages ; aucun
 * des deux n'est jamais restreint.
 */
export type GroupRole = "owner" | "admin" | "member"

/** Ce que le propriétaire peut retirer aux membres : écrire, envoyer des vocaux, lancer un appel. */
export type GroupAction = "write" | "voice" | "call"

/** Pour chaque action : permise ou non. */
export type GroupPermissions = Record<GroupAction, boolean>

/**
 * Pourquoi une action est interdite : réservée aux administrateurs pour tout
 * le groupe (`group`), ou retirée à ce membre en particulier (`personal`).
 */
export type Restriction = "group" | "personal"

/** Ce que l'utilisateur peut faire dans une conversation. */
export interface ConversationRights {
  /** Supprimer n'importe quel message (propriétaire et administrateurs d'un groupe). */
  moderate: boolean
  /** Pour chaque action : `null` si elle est permise, sinon pourquoi elle ne l'est pas. */
  restrictions: Record<GroupAction, Restriction | null>
}

export interface GroupMember extends PublicUser {
  role: GroupRole
  /** Restrictions propres à ce membre (sans effet sur le propriétaire et les administrateurs). */
  permissions: GroupPermissions
}

export interface GroupSummary {
  id: string
  name: string
  /** Adresse de la photo, relative à l'API (voir `apiUrl`) ; `null` sans photo. */
  photoUrl: string | null
  /** Celui qui administre le groupe ; au départ, son créateur. */
  ownerId: string | null
  /** Date ISO 8601. */
  createdAt: string
  /** Par ordre d'arrivée. */
  members: GroupMember[]
  /** Ce que tous les simples membres peuvent faire. */
  permissions: GroupPermissions
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
  /** Un message annoncé n'est plus à lire (retiré ou supprimé) : la pastille le décompte. */
  "social:message-removed": (event: MessageRemovedNotice) => void
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
  /** Pour le décompter s'il est retiré, et l'oublier à son expiration. */
  messageId: string
  /** Date ISO 8601 à laquelle le message disparaît. */
  expiresAt: string
}

/** Un message annoncé a été retiré par son auteur ou supprimé par un modérateur. */
export interface MessageRemovedNotice {
  conversation: ConversationTarget
  messageId: string
}

/** Clé d'une conversation pour compter ses messages non lus. */
export function conversationKey(
  target: { type: "direct"; userId: string } | { type: "group"; groupId: string }
) {
  return target.type === "direct" ? `direct:${target.userId}` : `group:${target.groupId}`
}
