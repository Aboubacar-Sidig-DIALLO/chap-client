import { BubbleChatIcon, HeadsetIcon, Mic01Icon } from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import type { ConversationRights, GroupAction, GroupRole, GroupSummary, Restriction } from "../types"

/**
 * Droits dans un groupe, côté interface : de quoi montrer ou masquer une
 * action. Le serveur les vérifie de son côté à chaque fois
 * (`sse/src/social/group-rights.ts`).
 */

/** Les actions que le propriétaire peut restreindre, dans l'ordre d'affichage. */
export const GROUP_ACTIONS: { action: GroupAction; label: string; icon: IconSvgElement }[] = [
  { action: "write", label: "Écrire des messages", icon: BubbleChatIcon },
  { action: "voice", label: "Envoyer des vocaux", icon: Mic01Icon },
  { action: "call", label: "Lancer un appel", icon: HeadsetIcon },
]

/** Le rôle de `userId` dans le groupe ; `null` s'il n'en fait pas partie. */
export function roleIn(group: GroupSummary, userId: string): GroupRole | null {
  return group.members.find((member) => member.id === userId)?.role ?? null
}

/** Ajouter des membres : le propriétaire et ses administrateurs. */
export function canAddMembers(role: GroupRole | null) {
  return role === "owner" || role === "admin"
}

export const ROLE_LABELS: Record<Exclude<GroupRole, "member">, string> = {
  owner: "Propriétaire",
  admin: "Admin",
}

/** Entre amis (ou en attendant le serveur) : rien n'est restreint. */
export const FULL_RIGHTS: ConversationRights = {
  moderate: false,
  restrictions: { write: null, voice: null, call: null },
}

const RESTRICTION_NOTICES: Record<GroupAction, Record<Restriction, string>> = {
  write: {
    group: "Seuls les administrateurs peuvent écrire dans ce groupe",
    personal: "Vous ne pouvez plus écrire dans ce groupe",
  },
  voice: {
    group: "Seuls les administrateurs peuvent envoyer des vocaux",
    personal: "Vous ne pouvez plus envoyer de vocaux dans ce groupe",
  },
  call: {
    group: "Seuls les administrateurs peuvent lancer un appel",
    personal: "Vous ne pouvez plus lancer d'appel dans ce groupe",
  },
}

/** Pourquoi l'action est indisponible, en clair ; `null` si elle est permise. */
export function restrictionNotice(rights: ConversationRights, action: GroupAction): string | null {
  const restriction = rights.restrictions[action]
  return restriction ? RESTRICTION_NOTICES[action][restriction] : null
}
