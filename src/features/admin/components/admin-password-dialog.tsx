"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { PasswordField } from "@/features/auth/components/password-field"
import { MIN_PASSWORD_LENGTH, passwordProblem } from "@/features/auth/lib/password"
import { AdminActionError } from "../lib/api"
import type { AdminUser } from "../types"
import { AdminSheet, FormError } from "./admin-sheet"

/** `promote` : nommer administrateur ; `reset` : nouveau mot de passe d'un administrateur. */
export type AdminPasswordMode = "promote" | "reset"

const COPY: Record<AdminPasswordMode, { title: (name: string) => string; description: string; submit: string }> = {
  promote: {
    title: (name) => `Nommer ${name} administrateur`,
    description:
      "Un administrateur se connecte avec un mot de passe. Choisissez-en un : ses sessions actuelles se ferment et il devra se reconnecter avec. Il pourra gérer tous les comptes.",
    submit: "Nommer administrateur",
  },
  reset: {
    title: (name) => `Nouveau mot de passe pour ${name}`,
    description: "L'ancien mot de passe ne fonctionnera plus. Transmettez le nouveau de façon sûre.",
    submit: "Enregistrer le mot de passe",
  },
}

interface AdminPasswordDialogProps {
  mode: AdminPasswordMode
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (password: string) => Promise<unknown>
}

/** Mot de passe donné à un administrateur, choisi ou généré. */
export function AdminPasswordDialog({ mode, user, open, onOpenChange, onSubmit }: AdminPasswordDialogProps) {
  const copy = COPY[mode]
  return (
    <AdminSheet open={open} onOpenChange={onOpenChange} title={copy.title(user.name)} description={copy.description}>
      <PasswordForm submitLabel={copy.submit} onSubmit={onSubmit} onDone={() => onOpenChange(false)} />
    </AdminSheet>
  )
}

interface PasswordFormProps {
  submitLabel: string
  onSubmit: (password: string) => Promise<unknown>
  onDone: () => void
}

function PasswordForm({ submitLabel, onSubmit, onDone }: PasswordFormProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving) return
    const problem = passwordProblem(password)
    if (problem) return setError(problem)

    setIsSaving(true)
    setError(null)
    try {
      await onSubmit(password)
      onDone()
    } catch (submitError) {
      setError(submitError instanceof AdminActionError ? submitError.message : "L'enregistrement a échoué.")
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PasswordField
        label="Mot de passe"
        autoFocus
        canGenerate
        value={password}
        onChange={(value) => {
          setPassword(value)
          setError(null)
        }}
        autoComplete="new-password"
        hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères. Il pourra le changer dans son profil.`}
      />
      <FormError message={error} />
      <Button type="submit" size="lg" disabled={password === "" || isSaving} className="h-12 text-base sm:h-11">
        {isSaving && <Spinner />}
        {submitLabel}
      </Button>
    </form>
  )
}
