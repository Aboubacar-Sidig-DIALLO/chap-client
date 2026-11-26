import { UserShield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { formatBan, formatDate } from "../lib/format"
import type { AdminUser } from "../types"

const BADGE = "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"

/** « Admin » (en couleur « voix ») ; rien pour un simple utilisateur, le cas courant. */
export function RoleBadge({ role }: { role: AdminUser["role"] }) {
  if (role !== "admin") return <span className="text-sm text-muted-foreground">Utilisateur</span>
  return (
    <span className={cn(BADGE, "bg-voice/12 text-voice")}>
      <HugeiconsIcon icon={UserShield01Icon} size={12} strokeWidth={2} aria-hidden />
      Admin
    </span>
  )
}

/** Suspendu (avec sa fin et son motif au survol), en ligne, ou dernière présence. */
export function StatusBadge({ user }: { user: AdminUser }) {
  if (user.banned) {
    return (
      <span
        title={user.banReason ? `Motif : ${user.banReason}` : undefined}
        className={cn(BADGE, "bg-destructive/10 text-destructive")}
      >
        {formatBan(user.banExpires)}
      </span>
    )
  }
  if (user.online) {
    return (
      <span className={cn(BADGE, "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300")}>
        <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
        En ligne
      </span>
    )
  }
  return (
    <span className="text-sm whitespace-nowrap text-muted-foreground">
      {user.lastSeenAt ? `Vu le ${formatDate(user.lastSeenAt)}` : "Jamais connecté"}
    </span>
  )
}
