import { UserAvatar } from "@/features/chat/components/user-avatar"
import type { Presence, PublicUser } from "../types"
import { ListRow } from "./list-row"
import { PresenceAvatar } from "./presence-avatar"

interface PersonRowProps {
  user: PublicUser
  /** Ligne secondaire (ex. « Demande envoyée »). */
  description?: React.ReactNode
  /** Boutons à droite. */
  actions?: React.ReactNode
  /** Rend la ligne cliquable (ex. ouvrir la conversation avec un ami). */
  href?: string
  /** Conversation avec cette personne ouverte à l'écran. */
  isActive?: boolean
  /** Messages reçus pas encore lus. */
  unreadCount?: number
  /** Présence (amis uniquement) : pastille sur l'avatar. */
  presence?: Presence
}

/** Une personne : avatar, nom, et les actions possibles. Hauteur tactile confortable. */
export function PersonRow({ user, presence, ...row }: PersonRowProps) {
  return (
    <ListRow
      {...row}
      title={user.name}
      leading={
        presence ? (
          <PresenceAvatar user={user} presence={presence} />
        ) : (
          <UserAvatar user={{ id: user.id, name: user.name, avatarUrl: user.image ?? undefined }} size="lg" />
        )
      }
    />
  )
}
