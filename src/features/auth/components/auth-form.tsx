"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"
import { type AuthError, getAuthErrorMessage } from "../lib/errors"
import { ROUTES } from "../lib/routes"
import { isValidEmail, MAX_NAME_LENGTH, normalizeEmail, normalizeName } from "../lib/validation"
import { FormError } from "./form-error"

export type AuthMode = "sign-up" | "sign-in"

interface AuthFormProps {
  mode: AuthMode
  initialEmail?: string
}

const ERROR_ID = "auth-error"
const FIELD_CLASS = "h-12 px-4 text-base sm:h-11"

/** Lien proposé avec l'erreur, quand l'autre parcours est la bonne porte. */
const ERROR_ACTIONS: Record<string, { label: string; route: string }> = {
  ACCOUNT_NOT_FOUND: { label: "Créer un compte", route: ROUTES.signUp },
  ACCOUNT_EXISTS: { label: "Se connecter", route: ROUTES.signIn },
}

/**
 * Formulaire d'inscription (nom + email) ou de connexion (email seul).
 * En cas de succès, la session se met à jour et la page redirige vers le chat.
 */
export function AuthForm({ mode, initialEmail = "" }: AuthFormProps) {
  const isSignUp = mode === "sign-up"
  const [name, setName] = useState("")
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState<AuthError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isComplete = email.trim() !== "" && (!isSignUp || name.trim() !== "")

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isComplete || isSubmitting) return

    const cleanEmail = normalizeEmail(email)
    if (!isValidEmail(cleanEmail)) {
      setError({ code: "INVALID_EMAIL" })
      return
    }

    setError(null)
    setIsSubmitting(true)
    const { error: serverError } = isSignUp
      ? await authClient.signUpWithEmail({ name: normalizeName(name), email: cleanEmail })
      : await authClient.signInWithEmail({ email: cleanEmail })

    // Succès : le bouton reste en attente jusqu'à la redirection.
    if (serverError) {
      setError(serverError)
      setIsSubmitting(false)
    }
  }

  const errorAction = error?.code ? ERROR_ACTIONS[error.code] : undefined

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-4 text-left">
      {isSignUp && (
        <label className="flex flex-col gap-1.5">
          <span className="px-1 text-sm font-medium">Nom ou pseudo</span>
          <Input
            autoFocus
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Comment vous appelle-t-on ?"
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="next"
            className={FIELD_CLASS}
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="px-1 text-sm font-medium">Adresse email</span>
        <Input
          autoFocus={!isSignUp}
          required
          type="email"
          inputMode="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setError(null)
          }}
          placeholder="vous@exemple.fr"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? ERROR_ID : undefined}
          className={FIELD_CLASS}
        />
      </label>

      <FormError id={ERROR_ID}>
        {error && (
          <>
            {getAuthErrorMessage(error)}
            {errorAction && (
              <>
                {" "}
                <Link
                  href={`${errorAction.route}?email=${encodeURIComponent(normalizeEmail(email))}`}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  {errorAction.label}
                </Link>
              </>
            )}
          </>
        )}
      </FormError>

      <Button
        type="submit"
        size="lg"
        disabled={!isComplete || isSubmitting}
        className="mt-1 h-12 text-base sm:h-11"
      >
        {isSubmitting ? (
          <>
            <Spinner /> {isSignUp ? "Création du compte…" : "Connexion…"}
          </>
        ) : isSignUp ? (
          "Créer mon compte"
        ) : (
          "Se connecter"
        )}
      </Button>
    </form>
  )
}
