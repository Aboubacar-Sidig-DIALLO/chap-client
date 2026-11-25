import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "../lib/format"
import type { ChatUser } from "../types"

interface UserAvatarProps extends React.ComponentProps<typeof Avatar> {
  user: ChatUser
}

/** Avatar d'un utilisateur ; `children` s'ajoute à l'image (ex. une infobulle). */
export function UserAvatar({ user, children, ...props }: UserAvatarProps) {
  return (
    <Avatar {...props}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      {children}
    </Avatar>
  )
}
