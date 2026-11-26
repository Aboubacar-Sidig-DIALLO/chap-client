"use client"

import { ConfirmDialog } from "@/components/confirm-dialog"
import type { SessionUser } from "@/features/auth/components/session-gate"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { authClient } from "@/lib/auth-client"
import { Logout01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

/** Bonjour le matin et l'après-midi, bonsoir à partir de 18 h. */
function greeting() {
  return new Date().getHours() >= 18 ? "Bonsoir" : "Bonjour"
}

interface HomeHeaderProps {
  user: SessionUser
  /** Titre de la page (`h1`) ; sinon c'est la conversation ouverte à côté qui l'est. */
  isPageTitle: boolean
}

/** En-tête de l'accueil : salutation personnalisée, avatar et déconnexion. */
export function HomeHeader({ user, isPageTitle }: HomeHeaderProps) {
  const firstName = user.name.split(" ")[0]
  const Title = isPageTitle ? "h1" : "p"

  return (
    <header className="flex items-center gap-3 md:px-1">
      <UserAvatar
        user={{ id: user.id, name: user.name, avatarUrl: user.image ?? undefined }}
        size="lg"
      />
      <div className="min-w-0 flex-1">
        <Title className="truncate text-2xl font-semibold tracking-tight md:text-lg">
          {greeting()}, {firstName}
        </Title>
        <p className="truncate text-sm text-muted-foreground md:text-xs">
          Avec qui voulez-vous parler aujourd&apos;hui ?
        </p>
      </div>
      <ConfirmDialog
        trigger={<HugeiconsIcon icon={Logout01Icon} size={20} strokeWidth={2} />}
        triggerLabel="Se déconnecter"
        title="Se déconnecter ?"
        description="Vous pourrez vous reconnecter à tout moment avec votre adresse email."
        confirmLabel="Se déconnecter"
        onConfirm={() => void authClient.signOut()}
      />
    </header>
  )
}
