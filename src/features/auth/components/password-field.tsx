"use client"

import { useState } from "react"
import { SparklesIcon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { generatePassword, MAX_PASSWORD_LENGTH } from "../lib/password"

interface PasswordFieldProps extends Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> {
  label: string
  value: string
  onChange: (value: string) => void
  /** Aide sous le champ (ex. « Au moins 12 caractères »). */
  hint?: React.ReactNode
  /**
   * Propose « Générer » : un mot de passe robuste, affiché en clair pour être
   * copié et transmis. Pour un mot de passe donné à quelqu'un d'autre.
   */
  canGenerate?: boolean
}

/** Champ mot de passe, avec « afficher / masquer » (et « générer » au besoin). */
export function PasswordField({ label, value, onChange, hint, canGenerate = false, className, ...props }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between gap-2 px-1 text-sm font-medium">
        {label}
        {canGenerate && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              onChange(generatePassword())
              setIsVisible(true)
            }}
            className="text-voice hover:text-voice"
          >
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} data-icon="inline-start" />
            Générer
          </Button>
        )}
      </span>
      <span className="relative">
        <Input
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={MAX_PASSWORD_LENGTH}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={cn("h-12 pr-12 pl-4 text-base sm:h-11", isVisible && "font-mono", className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-1.5 my-auto size-9 text-muted-foreground"
        >
          <HugeiconsIcon icon={isVisible ? ViewOffSlashIcon : ViewIcon} size={18} strokeWidth={2} />
        </Button>
      </span>
      {hint && <span className="px-1 text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}
