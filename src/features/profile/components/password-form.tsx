"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { FormError } from "@/features/auth/components/form-error"
import { PasswordField } from "@/features/auth/components/password-field"
import { type AuthError, getAuthErrorMessage } from "@/features/auth/lib/errors"
import { MIN_PASSWORD_LENGTH, passwordProblem } from "@/features/auth/lib/password"
import { authClient } from "@/lib/auth-client"
import { FORM_CARD_CLASS } from "./profile-styles"
import { SavedStatus } from "./saved-status"

const ERROR_ID = "password-error"

/**
 * Mot de passe d'un administrateur (les autres comptes n'en ont pas). Le
 * changer déconnecte ses autres appareils : une session ouverte avec l'ancien
 * mot de passe, peut-être compromis, ne survit pas.
 */
export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle")
  /** Erreur du serveur (traduite) ou de saisie (déjà en clair). */
  const [error, setError] = useState<AuthError | string | null>(null)

  const canSave = currentPassword !== "" && newPassword !== "" && confirmation !== "" && status !== "saving"

  function edit(setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setStatus("idle")
      setError(null)
    }
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return
    const problem = passwordProblem(newPassword)
    if (problem) return setError(`Nouveau mot de passe : ${problem.toLowerCase()}`)
    if (newPassword !== confirmation) return setError("Les deux nouveaux mots de passe ne correspondent pas.")
    if (newPassword === currentPassword) return setError("Choisissez un mot de passe différent de l'actuel.")

    setStatus("saving")
    setError(null)
    const { error: serverError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    })
    if (serverError) {
      setError(serverError)
      setStatus("idle")
      return
    }
    setCurrentPassword("")
    setNewPassword("")
    setConfirmation("")
    setStatus("saved")
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={FORM_CARD_CLASS}>
      <PasswordField
        label="Mot de passe actuel"
        value={currentPassword}
        onChange={edit(setCurrentPassword)}
        autoComplete="current-password"
      />
      <PasswordField
        label="Nouveau mot de passe"
        value={newPassword}
        onChange={edit(setNewPassword)}
        autoComplete="new-password"
        hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères.`}
      />
      <PasswordField
        label="Confirmez le nouveau mot de passe"
        value={confirmation}
        onChange={edit(setConfirmation)}
        autoComplete="new-password"
        aria-describedby={error ? ERROR_ID : undefined}
      />
      <FormError id={ERROR_ID} gap={12}>
        {error && (typeof error === "string" ? error : getAuthErrorMessage(error))}
      </FormError>

      <div className="flex items-center justify-end gap-3">
        <SavedStatus show={status === "saved"}>Modifié · autres appareils déconnectés</SavedStatus>
        <Button type="submit" disabled={!canSave} className="h-10 rounded-full px-5">
          {status === "saving" ? (
            <>
              <Spinner /> Enregistrement…
            </>
          ) : (
            "Changer le mot de passe"
          )}
        </Button>
      </div>
    </form>
  )
}
