"use client"

import { useRef, useState } from "react"
import { Camera01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog"
import { Reveal } from "@/components/motion/reveal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { GROUP_NAME_MAX_LENGTH } from "../../lib/config"
import { prepareGroupPhoto } from "../../lib/group-photo"
import type { GroupSummary } from "../../types"
import { GroupAvatar } from "../group-avatar"
import type { RunAction } from "./shared"

interface GroupIdentityProps {
  group: GroupSummary
  isOwner: boolean
  run: RunAction
  onRename: (name: string) => Promise<void>
  onPhotoChange: (photo: Blob) => Promise<void>
  onPhotoRemove: () => Promise<void>
}

/** Photo et nom du groupe ; le propriétaire les modifie sur place. */
export function GroupIdentity({ group, isOwner, run, onRename, onPhotoChange, onPhotoRemove }: GroupIdentityProps) {
  const count = group.members.length

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {isOwner ? (
        <GroupPhotoEditor group={group} run={run} onChange={onPhotoChange} onRemove={onPhotoRemove} />
      ) : (
        <GroupAvatar group={group} size="xl" />
      )}

      {isOwner ? (
        <GroupNameEditor key={group.name} name={group.name} run={run} onRename={onRename} />
      ) : (
        <Dialog.Title className="max-w-full truncate text-xl font-semibold">{group.name}</Dialog.Title>
      )}
      <Dialog.Description className="-mt-2 text-sm text-muted-foreground">
        Groupe · {count} membre{count > 1 ? "s" : ""}
      </Dialog.Description>
    </div>
  )
}

interface GroupPhotoEditorProps {
  group: GroupSummary
  run: RunAction
  onChange: (photo: Blob) => Promise<void>
  onRemove: () => Promise<void>
}

/** Toucher la photo pour la changer ; « Retirer la photo » s'il y en a une. */
function GroupPhotoEditor({ group, run, onChange, onRemove }: GroupPhotoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function save(action: () => Promise<unknown>) {
    setIsSaving(true)
    await run(action)
    setIsSaving(false)
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Vidé tout de suite : choisir à nouveau la même image relance l'envoi.
    event.target.value = ""
    if (file) void save(async () => onChange(await prepareGroupPhoto(file)))
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isSaving}
        aria-label={group.photoUrl ? "Changer la photo du groupe" : "Ajouter une photo au groupe"}
        className="group/photo relative rounded-[1.75rem] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <GroupAvatar group={group} size="xl" />
        <span
          aria-hidden
          className="absolute -right-1.5 -bottom-1.5 grid size-9 place-items-center rounded-full bg-foreground text-background shadow-md ring-4 ring-background transition-transform group-hover/photo:scale-105"
        >
          {isSaving ? <Spinner size={14} /> : <HugeiconsIcon icon={Camera01Icon} size={16} strokeWidth={2} />}
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="sr-only" tabIndex={-1} />
      <Reveal show={group.photoUrl !== null}>
        <Button
          variant="ghost"
          size="xs"
          disabled={isSaving}
          onClick={() => void save(onRemove)}
          className="text-muted-foreground"
        >
          Retirer la photo
        </Button>
      </Reveal>
    </div>
  )
}

interface GroupNameEditorProps {
  name: string
  run: RunAction
  onRename: (name: string) => Promise<void>
}

/** Le nom se modifie sur place ; « Enregistrer » apparaît dès qu'il change. */
function GroupNameEditor({ name, run, onRename }: GroupNameEditorProps) {
  const [draft, setDraft] = useState(name)
  const [isSaving, setIsSaving] = useState(false)
  const trimmed = draft.trim().replace(/\s+/g, " ")
  const isChanged = trimmed !== name
  const canSave = isChanged && trimmed !== "" && !isSaving

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return
    setIsSaving(true)
    // Réussi : le nouveau nom revient du serveur et remonte ce champ (`key`).
    if (!(await run(() => onRename(trimmed)))) setIsSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col items-center gap-2">
      <Dialog.Title className="sr-only">{name}</Dialog.Title>
      <Input
        aria-label="Nom du groupe"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={GROUP_NAME_MAX_LENGTH}
        autoCapitalize="sentences"
        enterKeyHint="done"
        className="h-11 border-transparent bg-transparent text-center text-xl font-semibold shadow-none hover:border-input focus-visible:border-ring md:text-xl"
      />
      {/* Le nom change : « Annuler » et « Enregistrer » se déplient dessous. */}
      <Reveal show={isChanged} className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(name)} disabled={isSaving}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={!canSave}>
            {isSaving && <Spinner />}
            Enregistrer
          </Button>
      </Reveal>
    </form>
  )
}
