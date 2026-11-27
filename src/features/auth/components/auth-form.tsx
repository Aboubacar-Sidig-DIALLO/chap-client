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
import { Reveal } from "@/components/motion/reveal"
import { FormError } from "./form-error"
import { PasswordField } from "./password-field"

export type AuthMode = "sign-up" | "sign-in"

interface AuthFormProps {
  mode: AuthMode
  initialEmail?: string
}

const ERROR_ID = "auth-error"
const FIELD_CLASS = "h-12 px-4 text-base sm:h-11"

type SubmitOutcome =
  | { status: "done" }
  | { status: "password-required" }
  | { status: "error"; error: AuthError }

/** Lien proposé avec l'erreur, quand l'autre parcours est la bonne porte. */
const ERROR_ACTIONS: Record<string, { label: string; route: string }> = {
  ACCOUNT_NOT_FOUND: { label: "Créer un compte", route: ROUTES.signUp },
  ACCOUNT_EXISTS: { label: "Se connecter", route: ROUTES.signIn },
}

/**
 * Formulaire d'inscription (nom + email) ou de connexion (email seul).
 * Un compte administrateur se connecte avec un mot de passe : le serveur le
 * signale, et le champ apparaît sous l'adresse.
 * En cas de succès, la session se met à jour et la page redirige vers le chat.
 */
export function AuthForm({ mode, initialEmail = "" }: AuthFormProps) {
  const isSignUp = mode === "sign-up"
  const [name, setName] = useState("")
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState("")
  /** Compte administrateur : connexion par mot de passe. */
  const [needsPassword, setNeedsPassword] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isComplete =
    email.trim() !== "" && (!isSignUp || name.trim() !== "") && (!needsPassword || password !== "")

  /** Envoie le formulaire : inscription, connexion par email seul, ou par mot de passe. */
  async function submit(cleanEmail: string): Promise<SubmitOutcome> {
    const { error: serverError } = isSignUp
      ? await authClient.signUpWithEmail({ name: normalizeName(name), email: cleanEmail })
      : needsPassword
        ? await authClient.signIn.email({ email: cleanEmail, password })
        : await authClient.signInWithEmail({ email: cleanEmail })

    if (!serverError) return { status: "done" }
    const authError = serverError as AuthError
    return authError.code === "PASSWORD_REQUIRED"
      ? { status: "password-required" }
      : { status: "error", error: authError }
  }

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
    const outcome = await submit(cleanEmail)

    switch (outcome.status) {
      // Succès : le bouton reste en attente jusqu'à la redirection.
      case "done":
        return
      // Compte administrateur : le champ mot de passe apparaît.
      case "password-required":
        setNeedsPassword(true)
        break
      case "error":
        setError(outcome.error)
        if (outcome.error.code === "INVALID_EMAIL_OR_PASSWORD") setPassword("")
        break
    }
    setIsSubmitting(false)
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
            // Autre adresse, autre compte : on repart de l'email seul.
            setNeedsPassword(false)
            setPassword("")
          }}
          placeholder="vous@exemple.fr"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint={needsPassword ? "next" : "go"}
          aria-invalid={error && !needsPassword ? true : undefined}
          aria-describedby={error ? ERROR_ID : undefined}
          className={FIELD_CLASS}
        />
      </label>

      {/* Compte administrateur : le mot de passe se dévoile sous l'adresse. */}
      <Reveal show={needsPassword} gap={16} className="flex flex-col gap-2">
          <p role="status" className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
            Compte administrateur : saisissez votre mot de passe.
          </p>
          <PasswordField
            label="Mot de passe"
            autoFocus
            required
            value={password}
            onChange={(value) => {
              setPassword(value)
              setError(null)
            }}
            autoComplete="current-password"
            enterKeyHint="go"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ERROR_ID : undefined}
          />
      </Reveal>

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
