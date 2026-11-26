import { AvatarBadge } from "@/components/ui/avatar"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { cn } from "@/lib/utils"
import type { Presence, PublicUser } from "../types"

/**
 * Avatar avec sa pastille de présence : verte en ligne, grise sinon.
 * Purement visuelle : le libellé (« En ligne », « Hors ligne depuis… ») porte l'information.
 */
interface PresenceAvatarProps {
  user: PublicUser
  presence: Presence
  size?: React.ComponentProps<typeof UserAvatar>["size"]
}

export function PresenceAvatar({ user, presence, size = "lg" }: PresenceAvatarProps) {
  return (
    <UserAvatar user={{ id: user.id, name: user.name, avatarUrl: user.image ?? undefined }} size={size}>
      <AvatarBadge
        aria-hidden
        className={cn("transition-colors", presence.online ? "bg-emerald-500" : "bg-muted-foreground/50")}
      />
    </UserAvatar>
  )
}
