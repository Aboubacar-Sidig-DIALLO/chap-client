"use client"

import Link from "next/link"
import type { SessionUser } from "@/features/auth/components/session-gate"
import { ROUTES } from "@/features/auth/lib/routes"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { greetingFor } from "../lib/greeting"
import { SignOutButton } from "./sign-out-button"

interface HomeHeaderProps {
  user: SessionUser
  /** Titre de la page (`h1`) ; sinon c'est la conversation ouverte à côté qui l'est. */
  isPageTitle: boolean
}

/**
 * En-tête de l'accueil sur mobile : salutation, avatar (vers le profil) et déconnexion.
 * Sur grand écran, la marque, la barre de compte et le panneau de bienvenue le remplacent.
 */
export function HomeHeader({ user, isPageTitle }: HomeHeaderProps) {
  const Title = isPageTitle ? "h1" : "p"

  return (
    <header className="flex items-center gap-3 md:hidden">
      <Link href={ROUTES.profile} aria-label="Mon profil" className="press rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <UserAvatar user={{ id: user.id, name: user.name, avatarUrl: user.image ?? undefined }} size="lg" />
      </Link>
      <div className="min-w-0 flex-1">
        <Title className="truncate text-2xl font-semibold tracking-tight">{greetingFor(user.name)}</Title>
        <p className="truncate text-sm text-muted-foreground">Avec qui voulez-vous parler aujourd&apos;hui ?</p>
      </div>
      <SignOutButton />
    </header>
  )
}
