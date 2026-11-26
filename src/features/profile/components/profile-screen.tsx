"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft01Icon, ArrowRight01Icon, Logout01Icon, UserShield01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Effect } from "@animate-ui/react/primitives/effects/effect"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { isAdmin } from "@/features/admin/lib/roles"
import { SessionGate, type SessionUser } from "@/features/auth/components/session-gate"
import { ROUTES } from "@/features/auth/lib/routes"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { Section } from "@/features/social/components/section"
import { authClient } from "@/lib/auth-client"
import { PAGE_ENTRANCE } from "@/lib/motion"
import { DeleteAccountDialog } from "./delete-account-dialog"
import { EmailForm } from "./email-form"
import { NameForm } from "./name-form"
import { PasswordForm } from "./password-form"

/** Profil : son nom, son adresse email, la déconnexion et la suppression du compte. */
export function ProfileScreen({ user }: { user: SessionUser }) {
  const [isSigningOut, setIsSigningOut] = useState(false)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-2">
        <Link
          href={ROUTES.home}
          aria-label="Retour à l'accueil"
          className={buttonVariants({ variant: "ghost", size: "icon", className: "-ml-2 size-10" })}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2} />
        </Link>
        <h1 className="text-lg font-semibold">Profil</h1>
      </header>

      <Effect {...PAGE_ENTRANCE} className="flex flex-col gap-6">
        {/* Identité : ce que voient vos amis (jamais votre adresse). */}
        <div className="flex flex-col items-center gap-3 text-center">
          {/* Même avatar que l'accueil, en grand. */}
          <UserAvatar
            aria-hidden
            user={{ id: user.id, name: user.name, avatarUrl: user.image ?? undefined }}
            className="size-20 *:data-[slot=avatar-fallback]:text-2xl *:data-[slot=avatar-fallback]:font-semibold"
          />
          <div className="min-w-0 max-w-full">
            <p className="truncate text-xl font-semibold tracking-tight">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Section title="Nom ou pseudo">
          <NameForm currentName={user.name} />
        </Section>

        <Section title="Adresse email">
          <EmailForm currentEmail={user.email} />
        </Section>

        {/* Seuls les administrateurs ont un mot de passe. */}
        {isAdmin(user) && (
          <Section title="Mot de passe">
            <PasswordForm />
          </Section>
        )}

        <Section title="Compte">
          <div className="divide-y overflow-hidden rounded-3xl border bg-card">
            {isAdmin(user) && (
              <Link
                href={ROUTES.admin}
                className={buttonVariants({ variant: "ghost", className: "h-12 w-full justify-start gap-3 rounded-none px-4" })}
              >
                <HugeiconsIcon icon={UserShield01Icon} size={18} strokeWidth={2} aria-hidden />
                <span className="flex-1">Administration</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} aria-hidden className="text-muted-foreground" />
              </Link>
            )}
            <Button
              variant="ghost"
              onClick={() => setIsSigningOut(true)}
              className="h-12 w-full justify-start gap-3 rounded-none px-4"
            >
              <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={2} aria-hidden />
              Se déconnecter
            </Button>
            <DeleteAccountDialog email={user.email} />
          </div>
          <p className="px-1 text-sm text-muted-foreground">
            Vos messages, photos et fichiers ne sont jamais conservés : ils disparaissent d&apos;eux-mêmes au
            bout d&apos;une heure.
          </p>
        </Section>
      </Effect>

      <ConfirmDialog
        open={isSigningOut}
        onOpenChange={setIsSigningOut}
        title="Se déconnecter ?"
        description="Vous pourrez vous reconnecter à tout moment avec votre adresse email."
        confirmLabel="Se déconnecter"
        onConfirm={() => void authClient.signOut()}
      />
    </main>
  )
}

/** Page de profil, réservée aux utilisateurs connectés. */
export function ProfilePage() {
  return <SessionGate>{(user) => <ProfileScreen user={user} />}</SessionGate>
}
