"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { FIELD_CLASS } from "@/features/profile/components/profile-styles"
import { PasswordField } from "@/features/auth/components/password-field"
import { MIN_PASSWORD_LENGTH, passwordProblem } from "@/features/auth/lib/password"
import { isValidEmail, MAX_NAME_LENGTH, normalizeEmail, normalizeName } from "@/features/auth/lib/validation"
import { cn } from "@/lib/utils"
import { AdminActionError } from "../lib/api"
import type { AdminRole, AdminUser } from "../types"
import { AdminSheet, FormError } from "./admin-sheet"

export interface UserFormValues {
  name: string
  email: string
  role: AdminRole
  /** Administrateur uniquement : son mot de passe de connexion. */
  password: string
}

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Compte à modifier ; absent : création d'un compte. */
  user?: AdminUser
  onSubmit: (values: UserFormValues) => Promise<unknown>
}

/**
 * Création ou modification d'un compte : nom et adresse (et rôle, à la
 * création). Un utilisateur se connecte avec son adresse seule ; un
 * administrateur reçoit aussi un mot de passe.
 */
export function UserFormDialog({ open, onOpenChange, user, onSubmit }: UserFormDialogProps) {
  return (
    <AdminSheet
      open={open}
      onOpenChange={onOpenChange}
      title={user ? `Modifier ${user.name}` : "Ajouter un utilisateur"}
      description={
        user
          ? "Son nom est visible de ses amis ; son adresse lui sert à se connecter."
          : "Un utilisateur se connecte avec son adresse seule ; un administrateur, avec un mot de passe."
      }
    >
      <UserForm user={user} onSubmit={onSubmit} onDone={() => onOpenChange(false)} />
    </AdminSheet>
  )
}

const ROLE_OPTIONS = [
  { value: "user", label: "Utilisateur", description: "Utilise l'application" },
  { value: "admin", label: "Administrateur", description: "Gère aussi les comptes" },
] as const satisfies readonly { value: AdminRole; label: string; description: string }[]

interface UserFormProps {
  user?: AdminUser
  onSubmit: (values: UserFormValues) => Promise<unknown>
  onDone: () => void
}

function UserForm({ user, onSubmit, onDone }: UserFormProps) {
  const [name, setName] = useState(user?.name ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [role, setRole] = useState<AdminRole>("user")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const needsPassword = !user && role === "admin"
  const values = { name: normalizeName(name), email: normalizeEmail(email), role, password: needsPassword ? password : "" }
  const isChanged = !user || values.name !== user.name || values.email !== user.email
  const canSubmit =
    values.name !== "" && values.email !== "" && (!needsPassword || password !== "") && isChanged && !isSaving

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    if (!isValidEmail(values.email)) return setError("Cette adresse email n'est pas valide.")
    const problem = needsPassword ? passwordProblem(password) : null
    if (problem) return setError(`Mot de passe : ${problem.toLowerCase()}`)

    setIsSaving(true)
    setError(null)
    try {
      await onSubmit(values)
      onDone()
    } catch (submitError) {
      setError(submitError instanceof AdminActionError ? submitError.message : "L'enregistrement a échoué.")
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="px-1 text-sm font-medium">Nom ou pseudo</span>
        <Input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          className={FIELD_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="px-1 text-sm font-medium">Adresse email</span>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className={FIELD_CLASS}
        />
      </label>

      {!user && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 px-1 text-sm font-medium">Rôle</legend>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-0.5 rounded-2xl border p-3 transition-colors has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
                  role === option.value ? "border-foreground bg-muted" : "hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {needsPassword && (
        <PasswordField
          label="Mot de passe"
          canGenerate
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères. Transmettez-le de façon sûre ; il pourra le changer dans son profil.`}
        />
      )}

      <FormError message={error} />

      <Button type="submit" size="lg" disabled={!canSubmit} className="h-12 text-base sm:h-11">
        {isSaving && <Spinner />}
        {user ? "Enregistrer" : "Créer le compte"}
      </Button>
    </form>
  )
}
