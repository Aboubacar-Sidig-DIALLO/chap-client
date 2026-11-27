"use client"

import { useState } from "react"
import { Logout01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import type { GroupMember, GroupSummary } from "../../types"
import { RoleBadge, toAvatarUser, ViewHeader, type RunAction } from "./shared"

const LEAVE_BUTTON_CLASS =
  "h-11 shrink-0 gap-2 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"

interface LeaveGroupButtonProps {
  group: GroupSummary
  currentUserId: string
  run: RunAction
  onLeave: () => Promise<void>
  onLeft: () => void
  /** Propriétaire d'un groupe où il reste du monde : il doit d'abord choisir son successeur. */
  onChooseSuccessor: () => void
}

/** Quitter le groupe ; la confirmation dit ce qu'il advient du groupe. */
export function LeaveGroupButton({
  group,
  currentUserId,
  run,
  onLeave,
  onLeft,
  onChooseSuccessor,
}: LeaveGroupButtonProps) {
  const [open, setOpen] = useState(false)
  const isAlone = group.members.every((member) => member.id === currentUserId)
  const mustChooseSuccessor = group.ownerId === currentUserId && !isAlone

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => (mustChooseSuccessor ? onChooseSuccessor() : setOpen(true))}
        className={LEAVE_BUTTON_CLASS}
      >
        <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={2} aria-hidden />
        Quitter le groupe
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Quitter « ${group.name} » ?`}
        description={
          isAlone
            ? "Vous êtes le dernier membre : le groupe sera supprimé."
            : "Les autres membres resteront dans le groupe ; vous n'en ferez plus partie."
        }
        confirmLabel={isAlone ? "Quitter et supprimer" : "Quitter"}
        onConfirm={() => {
          void run(onLeave).then((hasLeft) => {
            if (hasLeft) onLeft()
          })
        }}
      />
    </>
  )
}

interface ChooseSuccessorViewProps {
  group: GroupSummary
  currentUserId: string
  run: RunAction
  error: React.ReactNode
  onLeave: (successorId: string) => Promise<void>
  onLeft: () => void
  onBack: () => void
}

/**
 * Le propriétaire part : il choisit qui reprend le groupe (administrateurs
 * proposés en premier), puis le quitte, d'un seul geste.
 */
export function ChooseSuccessorView({ group, currentUserId, run, error, onLeave, onLeft, onBack }: ChooseSuccessorViewProps) {
  const [successorId, setSuccessorId] = useState<string | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const candidates = group.members
    .filter((member) => member.id !== currentUserId)
    // Tri stable : les administrateurs d'abord, chacun par ancienneté.
    .sort((a, b) => Number(b.role === "admin") - Number(a.role === "admin"))
  const successor = candidates.find((member) => member.id === successorId)

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!successor || isLeaving) return
    setIsLeaving(true)
    if (await run(() => onLeave(successor.id))) onLeft()
    else setIsLeaving(false)
  }

  return (
    <>
      <ViewHeader title={`Quitter « ${group.name} »`} description="Choisissez le nouveau propriétaire" onBack={onBack} />
      <p className="px-1 text-sm text-muted-foreground">
        Avant de partir, confiez le groupe à quelqu&apos;un : il pourra tout gérer (nom, photo, membres,
        administrateurs et autorisations).
      </p>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
        <fieldset className="flex min-h-0 flex-col">
          <legend className="sr-only">Nouveau propriétaire</legend>
          <ul className="-mx-2 min-h-0 overflow-y-auto overscroll-contain">
            {candidates.map((member) => (
              <li key={member.id}>
                <SuccessorOption
                  member={member}
                  checked={member.id === successorId}
                  onSelect={() => setSuccessorId(member.id)}
                />
              </li>
            ))}
          </ul>
        </fieldset>
        {error}
        <Button
          type="submit"
          variant="destructive"
          size="lg"
          disabled={!successor || isLeaving}
          className="h-12 shrink-0 text-base sm:h-11"
        >
          {isLeaving && <Spinner />}
          {successor ? `Confier à ${successor.name} et quitter` : "Choisissez un membre"}
        </Button>
      </form>
    </>
  )
}

interface SuccessorOptionProps {
  member: GroupMember
  checked: boolean
  onSelect: () => void
}

/** Bouton radio natif (clavier, lecteurs d'écran), habillé en ligne tactile. */
function SuccessorOption({ member, checked, onSelect }: SuccessorOptionProps) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-2 transition-colors hover:bg-muted has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50">
      <input type="radio" name="successor" checked={checked} onChange={onSelect} className="peer sr-only" />
      <UserAvatar user={toAvatarUser(member)} />
      <span className="min-w-0 flex-1 truncate">{member.name}</span>
      <RoleBadge role={member.role} />
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-border transition-colors peer-checked:border-voice"
      >
        <span className={checked ? "size-3 rounded-full bg-voice" : "size-3"} />
      </span>
    </label>
  )
}
