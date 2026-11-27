"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { FormError } from "@/features/auth/components/form-error"
import { type AuthError, getAuthErrorMessage } from "@/features/auth/lib/errors"
import { MAX_NAME_LENGTH, normalizeName } from "@/features/auth/lib/validation"
import { authClient } from "@/lib/auth-client"
import { FIELD_CLASS, FORM_CARD_CLASS } from "./profile-styles"
import { SavedStatus } from "./saved-status"

const ERROR_ID = "name-error"

/**
 * Nom ou pseudo, modifiable sur place. Better Auth met la session à jour ; le
 * serveur prévient les amis, dont les listes affichent aussitôt le nouveau nom.
 */
export function NameForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName)
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [error, setError] = useState<AuthError | null>(null)

  const cleanName = normalizeName(name)
  const canSave = cleanName !== "" && cleanName !== currentName && status !== "saving"

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return

    setStatus("saving")
    setError(null)
    const { error: serverError } = await authClient.updateUser({ name: cleanName })
    if (serverError) {
      setError(serverError)
      setStatus("idle")
      return
    }
    setName(cleanName)
    setStatus("saved")
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={FORM_CARD_CLASS}>
      <Input
        aria-label="Nom ou pseudo"
        value={name}
        onChange={(event) => {
          setName(event.target.value)
          setStatus("idle")
          setError(null)
        }}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="nickname"
        autoCapitalize="words"
        enterKeyHint="done"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? ERROR_ID : undefined}
        className={FIELD_CLASS}
      />
      <FormError id={ERROR_ID} gap={12}>{error && getAuthErrorMessage(error)}</FormError>

      <div className="flex items-center justify-end gap-3">
        <SavedStatus show={status === "saved"}>Enregistré</SavedStatus>
        <Button type="submit" disabled={!canSave} className="h-10 rounded-full px-5">
          {status === "saving" ? (
            <>
              <Spinner /> Enregistrement…
            </>
          ) : (
            "Enregistrer"
          )}
        </Button>
      </div>
    </form>
  )
}
