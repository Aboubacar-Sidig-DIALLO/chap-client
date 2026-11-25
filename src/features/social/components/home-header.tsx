"use client"

import { Logout01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import type { SessionUser } from "@/features/auth/components/session-gate"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { authClient } from "@/lib/auth-client"

/** Bonjour le matin et l'après-midi, bonsoir à partir de 18 h. */
function greeting() {
  return new Date().getHours() >= 18 ? "Bonsoir" : "Bonjour"
}

/** En-tête de l'accueil : salutation personnalisée, avatar et déconnexion. */
export function HomeHeader({ user }: { user: SessionUser }) {
  const firstName = user.name.split(" ")[0]

  return (
    <header className="flex items-center gap-3">
      <UserAvatar user={{ id: user.id, name: user.name, avatarUrl: user.image ?? undefined }} size="lg" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {greeting()}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">Avec qui voulez-vous parler aujourd&apos;hui ?</p>
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
