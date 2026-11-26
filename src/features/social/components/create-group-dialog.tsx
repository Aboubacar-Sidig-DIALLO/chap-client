"use client"

import { useState } from "react"
import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { GROUP_MAX_MEMBERS, GROUP_NAME_MAX_LENGTH } from "../lib/config"
import type { PublicUser } from "../types"
import { FriendPicker, toggleId } from "./friend-picker"

/** Ouverture d'une fenêtre, tenue par le parent. */
export interface DialogState {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CreateGroupFormProps {
  friends: PublicUser[]
  onCreate: (input: { name: string; memberIds: string[] }) => Promise<unknown>
}

/**
 * Création d'un groupe : un nom, des amis cochés, c'est fait.
 * Feuille ancrée en bas sur mobile, fenêtre centrée sur grand écran.
 * L'ouverture est pilotée par le parent : elle peut aussi venir du panneau de bienvenue.
 */
export function CreateGroupDialog({ open, onOpenChange, friends, onCreate }: DialogState & CreateGroupFormProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Trigger className={buttonVariants({ variant: "ghost", size: "sm", className: "h-9 text-voice md:h-8" })}>
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
        Nouveau groupe
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Popup
          from="bottom"
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-5 rounded-t-3xl border-t bg-background p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none",
            "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:pb-6"
          )}
        >
          <div aria-hidden className="mx-auto -mt-2 h-1 w-10 shrink-0 rounded-full bg-muted sm:hidden" />
          <div className="space-y-1">
            <Dialog.Title className="text-lg font-semibold">Nouveau groupe</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {friends.length > 0
                ? "Donnez-lui un nom et choisissez qui en fait partie."
                : "Un groupe réunit vos amis. Ajoutez d'abord des amis grâce à la recherche."}
            </Dialog.Description>
          </div>

          {friends.length > 0 ? (
            // Remonté à chaque ouverture : le formulaire repart de zéro.
            <CreateGroupForm friends={friends} onCreate={onCreate} onDone={() => onOpenChange(false)} />
          ) : (
            <Dialog.Close className={buttonVariants({ variant: "outline", size: "lg", className: "h-11" })}>
              Compris
            </Dialog.Close>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CreateGroupForm({
  friends,
  onCreate,
  onDone,
}: CreateGroupFormProps & { onDone: () => void }) {
  const [name, setName] = useState("")
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFull = selectedIds.size >= GROUP_MAX_MEMBERS - 1
  const canSubmit = name.trim() !== "" && selectedIds.size > 0 && !isSubmitting

  function toggle(userId: string) {
    setError(null)
    setSelectedIds((current) => toggleId(current, userId))
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    try {
      await onCreate({ name: name.trim(), memberIds: [...selectedIds] })
      onDone()
    } catch (createError) {
      setError(getErrorMessage(createError))
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="px-1 text-sm font-medium">Nom du groupe</span>
        <Input
          autoFocus
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
          }}
          maxLength={GROUP_NAME_MAX_LENGTH}
          placeholder="Ex. La famille, Les collègues…"
          autoCapitalize="sentences"
          enterKeyHint="done"
          className="h-12 px-4 text-base sm:h-11"
        />
      </label>

      <FriendPicker friends={friends} selectedIds={selectedIds} onToggle={toggle} isFull={isFull} />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={!canSubmit} className="h-12 shrink-0 text-base sm:h-11">
        {isSubmitting ? (
          <>
            <Spinner /> Création…
          </>
        ) : (
          "Créer le groupe"
        )}
      </Button>
    </form>
  )
}
