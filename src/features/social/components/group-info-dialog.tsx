"use client"

import { useRef, useState } from "react"
import {
  ArrowLeft01Icon,
  Camera01Icon,
  Crown02Icon,
  Logout01Icon,
  UserAdd01Icon,
  UserRemove01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog"
import { ConfirmDialog, SHEET_BACKDROP_CLASS } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { getErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useGroupDetails } from "../hooks/use-group-details"
import { GROUP_MAX_MEMBERS, GROUP_NAME_MAX_LENGTH } from "../lib/config"
import { PhotoError, prepareGroupPhoto } from "../lib/group-photo"
import type { GroupSummary, PublicUser } from "../types"
import { FriendPicker, toggleId } from "./friend-picker"
import { GroupAvatar } from "./group-avatar"

type GroupDetails = ReturnType<typeof useGroupDetails>

/** Une action de la fiche : son erreur s'affiche sur place, sans rien lever. */
type RunAction = (action: () => Promise<unknown>) => Promise<boolean>

interface GroupInfoDialogProps {
  groupId: string
  currentUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Vous avez quitté le groupe (ex. revenir à l'accueil si sa conversation était ouverte). */
  onLeft?: () => void
}

/**
 * Fiche d'un groupe : sa photo, son nom, ses membres. Tout le monde la
 * consulte et peut quitter le groupe ; seul son propriétaire le modifie
 * (nom, photo, ajout et retrait de membres).
 * Feuille ancrée en bas sur mobile, fenêtre centrée sur grand écran.
 */
export function GroupInfoDialog({ groupId, currentUserId, open, onOpenChange, onLeft }: GroupInfoDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className={SHEET_BACKDROP_CLASS} />
        <Dialog.Popup
          from="bottom"
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-5 overflow-y-auto overscroll-contain rounded-t-3xl border-t bg-background p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none",
            "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:pb-6"
          )}
        >
          <div aria-hidden className="mx-auto -mt-2 h-1 w-10 shrink-0 rounded-full bg-muted sm:hidden" />
          {/* Monté à chaque ouverture : données fraîches, formulaire vierge. */}
          <GroupInfo
            groupId={groupId}
            currentUserId={currentUserId}
            onClose={() => onOpenChange(false)}
            onLeft={() => {
              onOpenChange(false)
              onLeft?.()
            }}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface GroupInfoProps {
  groupId: string
  currentUserId: string
  onClose: () => void
  onLeft: () => void
}

function GroupInfo({ groupId, currentUserId, onClose, onLeft }: GroupInfoProps) {
  const details = useGroupDetails(groupId)
  const [view, setView] = useState<"info" | "add">("info")
  const [error, setError] = useState<string | null>(null)

  const run: RunAction = async (action) => {
    setError(null)
    try {
      await action()
      return true
    } catch (actionError) {
      setError(actionError instanceof PhotoError ? actionError.message : getErrorMessage(actionError))
      return false
    }
  }

  const { group, status } = details
  if (!group) {
    return <GroupInfoPlaceholder status={status} onRetry={details.reload} onClose={onClose} />
  }

  const isOwner = group.ownerId === currentUserId
  const errorNotice = error && (
    <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
      {error}
    </p>
  )

  if (view === "add" && isOwner) {
    return (
      <AddMembers
        group={group}
        friends={details.friends}
        run={run}
        error={errorNotice}
        onAdd={details.addMembers}
        onBack={() => {
          setError(null)
          setView("info")
        }}
      />
    )
  }

  return (
    <>
      <GroupIdentity group={group} isOwner={isOwner} details={details} run={run} />
      {errorNotice}
      <MemberList
        group={group}
        currentUserId={currentUserId}
        isOwner={isOwner}
        run={run}
        onRemove={details.removeMember}
        onAddClick={() => {
          setError(null)
          setView("add")
        }}
      />
      <LeaveGroupButton group={group} currentUserId={currentUserId} run={run} onLeave={details.leave} onLeft={onLeft} />
    </>
  )
}

/** Chargement, groupe disparu ou erreur : de quoi patienter, comprendre ou réessayer. */
function GroupInfoPlaceholder({
  status,
  onRetry,
  onClose,
}: {
  status: GroupDetails["status"]
  onRetry: () => Promise<void>
  onClose: () => void
}) {
  if (status === "loading" || status === "ready") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
        <Dialog.Title className="sr-only">Infos du groupe</Dialog.Title>
        <Spinner size={20} /> Chargement du groupe…
      </div>
    )
  }

  const isMissing = status === "missing"
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="space-y-1">
        <Dialog.Title className="font-semibold">
          {isMissing ? "Groupe introuvable" : "Impossible d'afficher le groupe"}
        </Dialog.Title>
        <Dialog.Description className="text-sm text-muted-foreground">
          {isMissing
            ? "Ce groupe n'existe plus, ou vous n'en faites plus partie."
            : "Vérifiez votre connexion, puis réessayez."}
        </Dialog.Description>
      </div>
      <Button variant="outline" onClick={isMissing ? onClose : () => void onRetry()}>
        {isMissing ? "Fermer" : "Réessayer"}
      </Button>
    </div>
  )
}

// ─── Photo et nom ─────────────────────────────────────────────────────────

interface GroupIdentityProps {
  group: GroupSummary
  isOwner: boolean
  details: GroupDetails
  run: RunAction
}

function GroupIdentity({ group, isOwner, details, run }: GroupIdentityProps) {
  const count = group.members.length

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {isOwner ? (
        <GroupPhotoEditor group={group} run={run} onChange={details.setPhoto} onRemove={details.removePhoto} />
      ) : (
        <GroupAvatar group={group} size="xl" />
      )}

      {isOwner ? (
        <GroupNameEditor key={group.name} name={group.name} run={run} onRename={details.rename} />
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

/** Propriétaire : toucher la photo pour la changer ; « Retirer la photo » s'il y en a une. */
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
      {group.photoUrl && (
        <Button
          variant="ghost"
          size="xs"
          disabled={isSaving}
          onClick={() => void save(onRemove)}
          className="text-muted-foreground"
        >
          Retirer la photo
        </Button>
      )}
    </div>
  )
}

interface GroupNameEditorProps {
  name: string
  run: RunAction
  onRename: (name: string) => Promise<void>
}

/** Propriétaire : le nom se modifie sur place ; « Enregistrer » apparaît dès qu'il change. */
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
      {isChanged && (
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(name)} disabled={isSaving}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={!canSave}>
            {isSaving && <Spinner />}
            Enregistrer
          </Button>
        </div>
      )}
    </form>
  )
}

// ─── Membres ──────────────────────────────────────────────────────────────

interface MemberListProps {
  group: GroupSummary
  currentUserId: string
  isOwner: boolean
  run: RunAction
  onRemove: (userId: string) => Promise<void>
  onAddClick: () => void
}

/** Membres par ordre d'arrivée, le propriétaire signalé ; lui seul ajoute ou retire. */
function MemberList({ group, currentUserId, isOwner, run, onRemove, onAddClick }: MemberListProps) {
  const isFull = group.members.length >= GROUP_MAX_MEMBERS

  return (
    <section aria-labelledby="group-members" className="flex flex-col gap-1.5">
      <h3 id="group-members" className="px-1 text-sm font-medium">
        Membres
      </h3>
      <ul className="-mx-2">
        {isOwner && (
          <li>
            <button
              type="button"
              onClick={onAddClick}
              disabled={isFull}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 text-left text-voice transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <span className="grid size-8 place-items-center rounded-full bg-voice/12">
                <HugeiconsIcon icon={UserAdd01Icon} size={16} strokeWidth={2} />
              </span>
              <span className="font-medium">{isFull ? "Groupe complet" : "Ajouter des membres"}</span>
            </button>
          </li>
        )}
        {group.members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isSelf={member.id === currentUserId}
            isMemberOwner={member.id === group.ownerId}
            canRemove={isOwner && member.id !== currentUserId}
            groupName={group.name}
            onRemove={() => void run(() => onRemove(member.id))}
          />
        ))}
      </ul>
    </section>
  )
}

interface MemberRowProps {
  member: PublicUser
  isSelf: boolean
  isMemberOwner: boolean
  canRemove: boolean
  groupName: string
  onRemove: () => void
}

function MemberRow({ member, isSelf, isMemberOwner, canRemove, groupName, onRemove }: MemberRowProps) {
  return (
    <li className="flex min-h-14 items-center gap-3 rounded-2xl px-2">
      <UserAvatar user={{ id: member.id, name: member.name, avatarUrl: member.image ?? undefined }} />
      <span className="min-w-0 flex-1 truncate">
        {member.name}
        {isSelf && <span className="text-muted-foreground"> (vous)</span>}
      </span>
      {isMemberOwner && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
          <HugeiconsIcon icon={Crown02Icon} size={12} strokeWidth={2} aria-hidden />
          Propriétaire
        </span>
      )}
      {canRemove && (
        <ConfirmDialog
          trigger={<HugeiconsIcon icon={UserRemove01Icon} size={18} strokeWidth={2} />}
          triggerLabel={`Retirer ${member.name} du groupe`}
          title={`Retirer ${member.name} ?`}
          description={`${member.name} ne fera plus partie de « ${groupName} » et n'aura plus accès à ses messages.`}
          confirmLabel="Retirer"
          onConfirm={onRemove}
        />
      )}
    </li>
  )
}

interface AddMembersProps {
  group: GroupSummary
  friends: PublicUser[]
  run: RunAction
  error: React.ReactNode
  onAdd: (memberIds: string[]) => Promise<void>
  onBack: () => void
}

/** Propriétaire : cocher des amis qui ne sont pas encore dans le groupe. */
function AddMembers({ group, friends, run, error, onAdd, onBack }: AddMembersProps) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const memberIds = new Set(group.members.map((member) => member.id))
  const candidates = friends.filter((friend) => !memberIds.has(friend.id))
  const isFull = group.members.length + selectedIds.size >= GROUP_MAX_MEMBERS

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedIds.size === 0 || isSaving) return
    setIsSaving(true)
    if (await run(() => onAdd([...selectedIds]))) onBack()
    else setIsSaving(false)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Retour à la fiche du groupe" onClick={onBack} className="-ml-2 size-9">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2} />
        </Button>
        <div className="min-w-0">
          <Dialog.Title className="text-lg font-semibold">Ajouter des membres</Dialog.Title>
          <Dialog.Description className="truncate text-sm text-muted-foreground">à « {group.name} »</Dialog.Description>
        </div>
      </div>

      {candidates.length === 0 ? (
        <p className="rounded-2xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          Tous vos amis font déjà partie du groupe. Ajoutez de nouveaux amis grâce à la recherche.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
          <FriendPicker
            friends={candidates}
            selectedIds={selectedIds}
            onToggle={(userId) => setSelectedIds((current) => toggleId(current, userId))}
            isFull={isFull}
          />
          {error}
          <Button type="submit" size="lg" disabled={selectedIds.size === 0 || isSaving} className="h-12 shrink-0 text-base sm:h-11">
            {isSaving && <Spinner />}
            {selectedIds.size > 1 ? `Ajouter ${selectedIds.size} personnes` : "Ajouter"}
          </Button>
        </form>
      )}
    </>
  )
}

// ─── Quitter ──────────────────────────────────────────────────────────────

interface LeaveGroupButtonProps {
  group: GroupSummary
  currentUserId: string
  run: RunAction
  onLeave: () => Promise<void>
  onLeft: () => void
}

/** Quitter le groupe ; la confirmation dit ce qu'il advient du groupe. */
function LeaveGroupButton({ group, currentUserId, run, onLeave, onLeft }: LeaveGroupButtonProps) {
  const [open, setOpen] = useState(false)
  const others = group.members.filter((member) => member.id !== currentUserId)
  const isOwner = group.ownerId === currentUserId

  const description =
    others.length === 0
      ? "Vous êtes le dernier membre : le groupe sera supprimé."
      : isOwner
        ? `${others[0].name} deviendra propriétaire du groupe. Les autres membres y resteront.`
        : "Les autres membres resteront dans le groupe ; vous n'en ferez plus partie."

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-11 shrink-0 gap-2 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={2} aria-hidden />
        Quitter le groupe
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Quitter « ${group.name} » ?`}
        description={description}
        confirmLabel="Quitter"
        onConfirm={() => {
          void run(onLeave).then((hasLeft) => {
            if (hasLeft) onLeft()
          })
        }}
      />
    </>
  )
}
