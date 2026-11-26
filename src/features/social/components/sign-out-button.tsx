"use client"

import { Logout01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { authClient } from "@/lib/auth-client"

/** Déconnexion, après confirmation (un clic malheureux ne ferme pas la session). */
export function SignOutButton() {
  return (
    <ConfirmDialog
      trigger={<HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={2} />}
      triggerLabel="Se déconnecter"
      title="Se déconnecter ?"
      description="Vous pourrez vous reconnecter à tout moment avec votre adresse email."
      confirmLabel="Se déconnecter"
      onConfirm={() => void authClient.signOut()}
    />
  )
}
