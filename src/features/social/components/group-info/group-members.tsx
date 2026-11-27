"use client"

import { useState } from "react"
import { ArrowRight01Icon, LockIcon, UserAdd01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { GROUP_MAX_MEMBERS } from "../../lib/config"
import { GROUP_ACTIONS } from "../../lib/group-rights"
import type { GroupMember, GroupSummary, PublicUser } from "../../types"
import { FriendPicker, toggleId } from "../friend-picker"
import { RoleBadge, toAvatarUser, ViewHeader, type RunAction } from "./shared"

const ROW_CLASS = "flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 text-left"
const ACTIONABLE_ROW_CLASS =
  "transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"

interface MemberListProps {
  group: GroupSummary
  currentUserId: string
  /** Propriétaire : chaque membre s'ouvre sur ses réglages (rôle, autorisations, retrait). */
  isOwner: boolean
  /** Propriétaire ou administrateur. */
  canAdd: boolean
  onAddClick: () => void
  onMemberClick: (member: GroupMember) => void
}

/** Membres par ordre d'arrivée, chacun avec son rôle. */
export function MemberList({ group, currentUserId, isOwner, canAdd, onAddClick, onMemberClick }: MemberListProps) {
  const isFull = group.members.length >= GROUP_MAX_MEMBERS

  return (
    <section aria-labelledby="group-members" className="flex flex-col gap-1.5">
      <h3 id="group-members" className="px-1 text-sm font-medium">
        Membres
      </h3>
      <ul className="-mx-2">
        {canAdd && (
          <li>
            <button
              type="button"
              onClick={onAddClick}
              disabled={isFull}
              className={`${ROW_CLASS} ${ACTIONABLE_ROW_CLASS} text-voice`}
            >
              <span className="grid size-8 place-items-center rounded-full bg-voice/12">
                <HugeiconsIcon icon={UserAdd01Icon} size={16} strokeWidth={2} />
              </span>
              <span className="font-medium">{isFull ? "Groupe complet" : "Ajouter des membres"}</span>
            </button>
          </li>
        )}
        {group.members.map((member) => {
          const isSelf = member.id === currentUserId
          const content = <MemberSummary member={member} isSelf={isSelf} showRestrictions={isOwner} />
          // Le propriétaire règle chacun des autres membres ; lui-même a toujours tous les droits.
          return (
            <li key={member.id}>
              {isOwner && !isSelf ? (
                <button
                  type="button"
                  onClick={() => onMemberClick(member)}
                  aria-label={`Gérer ${member.name}`}
                  className={`${ROW_CLASS} ${ACTIONABLE_ROW_CLASS}`}
                >
                  {content}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={16}
                    strokeWidth={2}
                    aria-hidden
                    className="shrink-0 text-muted-foreground"
                  />
                </button>
              ) : (
                <div className={ROW_CLASS}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

interface MemberSummaryProps {
  member: GroupMember
  isSelf: boolean
  /** Signale les restrictions personnelles (vues par le propriétaire seul). */
  showRestrictions: boolean
}

function MemberSummary({ member, isSelf, showRestrictions }: MemberSummaryProps) {
  const restricted = GROUP_ACTIONS.filter(({ action }) => !member.permissions[action])
  const isRestricted = showRestrictions && member.role === "member" && restricted.length > 0

  return (
    <>
      <UserAvatar user={toAvatarUser(member)} />
      <span className="min-w-0 flex-1 truncate">
        {member.name}
        {isSelf && <span className="text-muted-foreground"> (vous)</span>}
      </span>
      <RoleBadge role={member.role} />
      {isRestricted && (
        <span
          title={`Restreint : ${restricted.map(({ label }) => label.toLowerCase()).join(", ")}`}
          className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
        >
          <HugeiconsIcon icon={LockIcon} size={12} strokeWidth={2} aria-hidden />
          Restreint
        </span>
      )}
    </>
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

/** Cocher des amis qui ne sont pas encore dans le groupe. */
export function AddMembers({ group, friends, run, error, onAdd, onBack }: AddMembersProps) {
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
      <ViewHeader title="Ajouter des membres" description={`à « ${group.name} »`} onBack={onBack} />

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
