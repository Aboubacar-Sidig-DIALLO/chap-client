"use client"

import { useState } from "react"
import { AlertDialog } from "@animate-ui/react/primitives/base-ui/alert-dialog"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { SHEET_BACKDROP_CLASS, SHEET_POPUP_CLASS, SheetHandle } from "@/components/confirm-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { FormError } from "@/features/auth/components/form-error"
import { type AuthError, getAuthErrorMessage } from "@/features/auth/lib/errors"
import { ROUTES } from "@/features/auth/lib/routes"
import { endSessionsThenGo } from "@/features/auth/lib/session-signal"
import { normalizeEmail } from "@/features/auth/lib/validation"
import { authClient } from "@/lib/auth-client"

const ERROR_ID = "delete-account-error"

/**
 * Suppression définitive du compte. Taper son adresse email confirme la
 * demande (le serveur le vérifie aussi) : impossible de supprimer par mégarde.
 */
export function DeleteAccountDialog({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const [typedEmail, setTypedEmail] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  // Comparées normalisées des deux côtés, comme le fait le serveur.
  const isConfirmed = normalizeEmail(typedEmail) === normalizeEmail(email)

  function handleOpenChange(next: boolean) {
    // Pendant la suppression, la feuille reste ouverte.
    if (isDeleting) return
    setOpen(next)
    if (!next) {
      setTypedEmail("")
      setError(null)
    }
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isConfirmed || isDeleting) return

    setIsDeleting(true)
    setError(null)
    // Compte et sessions supprimés : l'application repart de zéro, sur l'inscription.
    const serverError = await endSessionsThenGo(
      () => authClient.deleteAccount({ email: normalizeEmail(typedEmail) }),
      ROUTES.signUp
    )
    if (serverError) {
      setError(serverError)
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Trigger
        className={buttonVariants({
          variant: "ghost",
          className: "h-12 w-full justify-start gap-3 rounded-none px-4 text-destructive hover:bg-destructive/5 hover:text-destructive",
        })}
      >
        <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={2} aria-hidden />
        Supprimer mon compte
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={SHEET_BACKDROP_CLASS} />
        <AlertDialog.Popup from="bottom" className={SHEET_POPUP_CLASS}>
          <SheetHandle />

          <div className="space-y-1.5 text-center sm:text-left">
            <AlertDialog.Title className="text-base font-semibold">Supprimer votre compte ?</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-balance text-muted-foreground">
              Vos amis, vos demandes et votre place dans vos groupes seront effacés, et vous serez déconnecté de
              tous vos appareils. C&apos;est définitif.
            </AlertDialog.Description>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="px-1 text-sm font-medium">
                Pour confirmer, tapez <span className="font-semibold">{email}</span>
              </span>
              <Input
                type="email"
                inputMode="email"
                value={typedEmail}
                onChange={(event) => {
                  setTypedEmail(event.target.value)
                  setError(null)
                }}
                placeholder={email}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={isDeleting}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? ERROR_ID : undefined}
                className="h-12 px-4 text-base sm:h-11"
              />
            </label>
            <FormError id={ERROR_ID}>{error && getAuthErrorMessage(error)}</FormError>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Close
                disabled={isDeleting}
                className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 sm:h-9" })}
              >
                Annuler
              </AlertDialog.Close>
              <Button
                type="submit"
                variant="destructive"
                size="lg"
                disabled={!isConfirmed || isDeleting}
                className="h-11 sm:h-9"
              >
                {isDeleting ? (
                  <>
                    <Spinner /> Suppression…
                  </>
                ) : (
                  "Supprimer définitivement"
                )}
              </Button>
            </div>
          </form>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
