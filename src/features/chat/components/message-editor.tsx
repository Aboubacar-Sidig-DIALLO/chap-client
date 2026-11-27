"use client"

import { useState } from "react"
import { PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useIsTouchDevice } from "../hooks/use-media-query"

/** Même limite que le serveur. */
const MAX_MESSAGE_LENGTH = 2000

interface MessageEditorProps {
  initialContent: string
  /** Le message garde des pièces jointes : son texte peut être vidé. */
  canBeEmpty: boolean
  /** Renvoie l'erreur à afficher, ou `null` une fois enregistré. */
  onSave: (content: string) => Promise<string | null>
  onClose: () => void
}

/**
 * Correction d'un message, à la place de sa bulle. Entrée enregistre (au
 * clavier physique), Échap annule ; les boutons font de même au doigt.
 */
export function MessageEditor({ initialContent, canBeEmpty, onSave, onClose }: MessageEditorProps) {
  const [value, setValue] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isTouchDevice = useIsTouchDevice()

  const content = value.trim()
  const canSave = !isSaving && content !== initialContent && (content !== "" || canBeEmpty)

  async function save() {
    if (!canSave) return
    setIsSaving(true)
    setError(null)
    const failure = await onSave(content)
    if (failure) {
      setError(failure)
      setIsSaving(false)
    } else {
      onClose()
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      onClose()
    } else if (!isTouchDevice && event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void save()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
      className="flex w-[85cqw] flex-col gap-2 rounded-2xl border bg-background p-2 shadow-sm sm:w-[75cqw]"
    >
      <p className="flex items-center gap-1.5 px-1.5 pt-0.5 text-xs font-medium text-muted-foreground">
        <HugeiconsIcon icon={PencilEdit02Icon} size={13} strokeWidth={2} aria-hidden />
        Modification du message
      </p>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        // Curseur à la fin du texte, prêt à corriger.
        onFocus={(event) => event.currentTarget.setSelectionRange(value.length, value.length)}
        autoFocus
        rows={1}
        maxLength={MAX_MESSAGE_LENGTH}
        aria-label="Texte du message"
        aria-invalid={error ? true : undefined}
        autoCapitalize="sentences"
        className="max-h-40 min-h-10 text-[15px] sm:text-sm"
      />
      {error && (
        <p role="alert" className="px-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={!canSave}>
          {isSaving && <Spinner />}
          Enregistrer
        </Button>
      </div>
    </form>
  )
}
