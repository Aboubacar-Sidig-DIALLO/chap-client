import Link from "next/link"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import type { Presence, PublicUser } from "../types"
import { PresenceAvatar } from "./presence-avatar"
import { UnreadBadge } from "./unread-badge"

interface PersonRowProps {
  user: PublicUser
  /** Ligne secondaire (ex. « Demande envoyée »). */
  description?: React.ReactNode
  /** Boutons à droite. */
  actions?: React.ReactNode
  /** Rend la ligne cliquable (ex. ouvrir la conversation avec un ami). */
  href?: string
  /** Messages reçus pas encore lus. */
  unreadCount?: number
  /** Présence (amis uniquement) : pastille sur l'avatar. */
  presence?: Presence
}

/** Une personne : avatar, nom, et les actions possibles. Hauteur tactile confortable. */
export function PersonRow({ user, description, actions, href, unreadCount = 0, presence }: PersonRowProps) {
  const identity = (
    <>
      {presence ? (
        <PresenceAvatar user={user} presence={presence} />
      ) : (
        <UserAvatar user={{ id: user.id, name: user.name, avatarUrl: user.image ?? undefined }} size="lg" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{user.name}</p>
        {description && <p className="truncate text-sm text-muted-foreground">{description}</p>}
      </div>
      <UnreadBadge count={unreadCount} />
    </>
  )

  return (
    <li className="flex min-h-16 items-center gap-1 pr-2">
      {href ? (
        <Link
          href={href}
          className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-2 pl-4 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted"
        >
          {identity}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-4">{identity}</div>
      )}
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </li>
  )
}
