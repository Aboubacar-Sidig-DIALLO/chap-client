import Link from "next/link"
import { ArrowRight01Icon, BubbleChatIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { SessionUser } from "@/features/auth/components/session-gate"
import { ROUTES } from "@/features/auth/lib/routes"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { APP_NAME } from "@/lib/config"
import { SignOutButton } from "./sign-out-button"

/** Lien de la barre latérale : surface entière qui s'enfonce légèrement à l'appui. */
const SIDEBAR_LINK =
  "press flex items-center rounded-xl outline-none [--press-scale:0.985] hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/50"

/**
 * Haut de la barre latérale sur grand écran : la marque, qui ramène à l'accueil.
 * Même hauteur que l'en-tête d'une conversation : leurs filets se prolongent.
 */
export function SidebarBrand() {
  return (
    <div className="hidden min-h-[4.25rem] shrink-0 items-center border-b px-3 md:flex">
      <Link href={ROUTES.home} aria-label={`${APP_NAME}, accueil`} className={`${SIDEBAR_LINK} gap-2.5 p-1.5 pr-3`}>
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-[0.625rem] bg-primary text-primary-foreground shadow-xs"
        >
          <HugeiconsIcon icon={BubbleChatIcon} size={18} strokeWidth={2} />
        </span>
        <span className="text-[0.9375rem] font-semibold tracking-tight">{APP_NAME}</span>
      </Link>
    </div>
  )
}

/** Bas de la barre latérale sur grand écran : son compte (vers le profil) et la déconnexion. */
export function AccountBar({ user }: { user: SessionUser }) {
  return (
    <div className="hidden shrink-0 items-center gap-1 border-t p-2 md:flex">
      <Link href={ROUTES.profile} className={`${SIDEBAR_LINK} group/account min-w-0 flex-1 gap-3 px-2 py-1.5`}>
        <UserAvatar aria-hidden user={{ id: user.id, name: user.name, avatarUrl: user.image ?? undefined }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">Voir mon profil</span>
        </span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={16}
          strokeWidth={2}
          aria-hidden
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/account:opacity-100 group-focus-visible/account:opacity-100"
        />
      </Link>
      <SignOutButton />
    </div>
  )
}
