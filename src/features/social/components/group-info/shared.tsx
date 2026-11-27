"use client"

import { ArrowLeft01Icon, Crown02Icon, UserShield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog"
import { Reveal } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import type { ChatUser } from "@/features/chat/types"
import { cn } from "@/lib/utils"
import { ROLE_LABELS } from "../../lib/group-rights"
import type { GroupRole, PublicUser } from "../../types"

/** Une action de la fiche : son erreur s'affiche sur place, sans rien lever. */
export type RunAction = (action: () => Promise<unknown>) => Promise<boolean>

/** Ce qu'attend `UserAvatar` pour un utilisateur de l'API sociale. */
export function toAvatarUser(user: PublicUser): ChatUser {
  return { id: user.id, name: user.name, avatarUrl: user.image ?? undefined }
}

interface ViewHeaderProps {
  title: string
  description?: React.ReactNode
  onBack: () => void
  /** Libellé du bouton retour, lu par les lecteurs d'écran. */
  backLabel?: string
}

/** En-tête d'une sous-vue de la fiche : retour, titre et précision. */
export function ViewHeader({ title, description, onBack, backLabel = "Retour à la fiche du groupe" }: ViewHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" aria-label={backLabel} onClick={onBack} className="-ml-2 size-9 shrink-0">
        <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2} />
      </Button>
      <div className="min-w-0">
        <Dialog.Title className="truncate text-lg font-semibold">{title}</Dialog.Title>
        {description && (
          <Dialog.Description className="truncate text-sm text-muted-foreground">{description}</Dialog.Description>
        )}
      </div>
    </div>
  )
}

const ROLE_BADGES = {
  owner: { icon: Crown02Icon, className: "bg-amber-500/12 text-amber-700 dark:text-amber-300" },
  admin: { icon: UserShield01Icon, className: "bg-voice/12 text-voice" },
} as const

/** Pastille « Propriétaire » ou « Admin » ; rien pour un simple membre. */
export function RoleBadge({ role, className }: { role: GroupRole; className?: string }) {
  if (role === "member") return null
  const badge = ROLE_BADGES[role]
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        badge.className,
        className
      )}
    >
      <HugeiconsIcon icon={badge.icon} size={12} strokeWidth={2} aria-hidden />
      {ROLE_LABELS[role]}
    </span>
  )
}

/** Message d'erreur d'une action de la fiche : il se déplie sur place, et se replie de même. */
export function ActionError({ message }: { message: string | null }) {
  return (
    // Les vues espacent leurs blocs de 20 px (`gap-5`).
    <Reveal show={message !== null} gap={20}>
      <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
        {message}
      </p>
    </Reveal>
  )
}
