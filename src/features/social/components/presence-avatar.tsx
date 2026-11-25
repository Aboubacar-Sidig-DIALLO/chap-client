import { AvatarBadge } from "@/components/ui/avatar"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { cn } from "@/lib/utils"
import type { Presence, PublicUser } from "../types"

/**
 * Avatar avec sa pastille de présence : verte en ligne, grise sinon.
 * Purement visuelle : le libellé (« En ligne », « Hors ligne depuis… ») porte l'information.
 */
export function PresenceAvatar({ user, presence }: { user: PublicUser; presence: Presence }) {
  return (
    <UserAvatar user={{ id: user.id, name: user.name, avatarUrl: user.image ?? undefined }} size="lg">
      <AvatarBadge
        aria-hidden
        className={cn("transition-colors", presence.online ? "bg-emerald-500" : "bg-muted-foreground/50")}
      />
    </UserAvatar>
  )
}
