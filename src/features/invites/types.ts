/** Contrat de l'API des invitations — à garder synchronisé avec le serveur (`sse/src/invites/invites.types.ts`). */
import type { PublicUser } from "@/features/social/types"

/** Ce à quoi invite le lien : devenir ami avec son auteur, ou rejoindre un groupe. */
export type InviteTarget = { type: "friend" } | { type: "group"; groupId: string }

/** Invitation créée (ou toujours valable), à partager par lien ou QR code. */
export interface CreatedInvite {
  token: string
  target: InviteTarget
  /** Date ISO 8601 à laquelle le lien cesse de fonctionner. */
  expiresAt: string
}

/** Ce qu'on montre d'un groupe à qui reçoit une invitation à le rejoindre. */
export interface InviteGroup {
  id: string
  name: string
  photoUrl: string | null
  memberCount: number
}

/**
 * Où en est celui qui ouvre le lien : il peut accepter (`pending`), c'est sa
 * propre invitation (`own`), ou c'est déjà fait (`done` : amis, ou membre).
 */
export type InviteStatus = "pending" | "own" | "done"

/** Invitation vue par celui qui ouvre le lien. */
export interface InvitePreview {
  inviter: PublicUser
  /** Groupe à rejoindre ; `null` : invitation à devenir amis. */
  group: InviteGroup | null
  expiresAt: string
  status: InviteStatus
}

/** Conversation ouverte par l'invitation acceptée. */
export type InviteAcceptance = { type: "direct"; userId: string } | { type: "group"; groupId: string }
