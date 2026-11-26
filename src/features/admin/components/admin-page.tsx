"use client"

import Link from "next/link"
import { SquareLock02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { buttonVariants } from "@/components/ui/button"
import { SessionGate } from "@/features/auth/components/session-gate"
import { ROUTES } from "@/features/auth/lib/routes"
import { isAdmin } from "../lib/roles"
import { AdminScreen } from "./admin-screen"

/**
 * Administration, réservée aux comptes de rôle `admin`. Ce contrôle évite
 * seulement d'afficher un écran inutile : le serveur refuse lui-même toute
 * requête d'administration venant d'un autre compte.
 */
export function AdminPage() {
  return <SessionGate>{(user) => (isAdmin(user) ? <AdminScreen currentUser={user} /> : <AdminForbidden />)}</SessionGate>
}

function AdminForbidden() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <HugeiconsIcon icon={SquareLock02Icon} size={26} strokeWidth={1.8} />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Accès réservé</h1>
        <p className="max-w-sm text-sm text-balance text-muted-foreground">
          L&apos;administration est réservée aux administrateurs de l&apos;application.
        </p>
      </div>
      <Link href={ROUTES.home} className={buttonVariants({ variant: "outline" })}>
        Retour à l&apos;accueil
      </Link>
    </main>
  )
}
