"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { FormError } from "@/features/auth/components/form-error"
import { type AuthError, getAuthErrorMessage } from "@/features/auth/lib/errors"
import { ROUTES } from "@/features/auth/lib/routes"
import { endSessionsThenGo } from "@/features/auth/lib/session-signal"
import { isValidEmail, normalizeEmail } from "@/features/auth/lib/validation"
import { authClient } from "@/lib/auth-client"
import { FIELD_CLASS, FORM_CARD_CLASS } from "./profile-styles"

const ERROR_ID = "email-error"
const HINT_ID = "email-hint"

/**
 * Adresse du compte. La changer ferme toutes les sessions : on se reconnecte
 * avec la nouvelle adresse, d'où une confirmation avant d'envoyer.
 */
export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)

  const cleanEmail = normalizeEmail(email)
  const canSubmit = cleanEmail !== "" && cleanEmail !== currentEmail && !isSubmitting

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    if (!isValidEmail(cleanEmail)) {
      setError({ code: "INVALID_EMAIL" })
      return
    }
    setIsConfirming(true)
  }

  async function changeEmail() {
    setIsSubmitting(true)
    setError(null)
    // Toutes les sessions sont fermées : retour à la connexion, nouvelle adresse pré-remplie.
    const serverError = await endSessionsThenGo(
      () => authClient.changeEmail({ newEmail: cleanEmail }),
      `${ROUTES.signIn}?email=${encodeURIComponent(cleanEmail)}`
    )
    if (serverError) {
      setError(serverError)
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className={FORM_CARD_CLASS}>
        <Input
          aria-label="Adresse email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setError(null)
          }}
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${ERROR_ID} ${HINT_ID}` : HINT_ID}
          className={FIELD_CLASS}
        />
        <FormError id={ERROR_ID}>{error && getAuthErrorMessage(error)}</FormError>
        <p id={HINT_ID} className="px-1 text-sm text-muted-foreground">
          Après le changement, vous serez déconnecté de tous vos appareils et vous vous reconnecterez avec la
          nouvelle adresse.
        </p>

        <div className="flex justify-end">
          <Button type="submit" disabled={!canSubmit} className="h-10 rounded-full px-5">
            {isSubmitting ? (
              <>
                <Spinner /> Changement…
              </>
            ) : (
              "Changer d'adresse"
            )}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        title="Changer d'adresse email ?"
        description={
          <>
            Vous serez déconnecté de tous vos appareils. Reconnectez-vous ensuite avec{" "}
            <strong className="font-medium text-foreground">{cleanEmail}</strong>.
          </>
        }
        confirmLabel="Changer et me déconnecter"
        tone="default"
        onConfirm={() => void changeEmail()}
      />
    </>
  )
}
