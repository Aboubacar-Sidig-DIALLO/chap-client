"use client"

import { useState } from "react"
import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog"
import { SHEET_BACKDROP_CLASS } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useGroupDetails } from "../../hooks/use-group-details"
import { canAddMembers, roleIn } from "../../lib/group-rights"
import { PhotoError } from "../../lib/group-photo"
import { GroupIdentity } from "./group-identity"
import { AddMembers, MemberList } from "./group-members"
import { GroupPermissionsView, MemberSettingsView, PermissionsRow } from "./group-permissions"
import { ChooseSuccessorView, LeaveGroupButton } from "./leave-group"
import { ActionError, type RunAction } from "./shared"

type GroupDetails = ReturnType<typeof useGroupDetails>

/** Vue affichée dans la fiche : la fiche elle-même, ou l'un de ses écrans. */
type View =
  | { name: "info" }
  | { name: "add" }
  | { name: "permissions" }
  | { name: "member"; memberId: string }
  | { name: "leave" }

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
 * consulte et peut quitter le groupe. Le propriétaire modifie tout (nom,
 * photo, membres, administrateurs, autorisations) ; ses administrateurs
 * ajoutent des membres.
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
  const [view, setView] = useState<View>({ name: "info" })
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

  function go(next: View) {
    setError(null)
    setView(next)
  }
  const back = () => go({ name: "info" })

  const { group, status } = details
  if (!group) {
    return <GroupInfoPlaceholder status={status} onRetry={details.reload} onClose={onClose} />
  }

  // Les droits suivent le groupe en temps réel : une vue devenue interdite
  // (rôle retiré, membre parti entre-temps) laisse place à la fiche.
  const role = roleIn(group, currentUserId)
  const isOwner = role === "owner"
  const errorNotice = <ActionError message={error} />

  if (view.name === "add" && canAddMembers(role)) {
    return (
      <AddMembers
        group={group}
        friends={details.friends}
        run={run}
        error={errorNotice}
        onAdd={details.addMembers}
        onBack={back}
      />
    )
  }

  if (view.name === "permissions" && isOwner) {
    return (
      <GroupPermissionsView group={group} run={run} error={errorNotice} onSave={details.setPermissions} onBack={back} />
    )
  }

  const member = view.name === "member" ? group.members.find((item) => item.id === view.memberId) : undefined
  if (member && isOwner && member.id !== currentUserId) {
    return (
      <MemberSettingsView
        group={group}
        member={member}
        run={run}
        error={errorNotice}
        onRoleChange={(nextRole) => details.setMemberRole(member.id, nextRole)}
        onPermissionsChange={(permissions) => details.setMemberPermissions(member.id, permissions)}
        onRemove={() => details.removeMember(member.id)}
        onBack={back}
      />
    )
  }

  if (view.name === "leave" && isOwner && group.members.length > 1) {
    return (
      <ChooseSuccessorView
        group={group}
        currentUserId={currentUserId}
        run={run}
        error={errorNotice}
        onLeave={details.leave}
        onLeft={onLeft}
        onBack={back}
      />
    )
  }

  return (
    <>
      <GroupIdentity
        group={group}
        isOwner={isOwner}
        run={run}
        onRename={details.rename}
        onPhotoChange={details.setPhoto}
        onPhotoRemove={details.removePhoto}
      />
      {errorNotice}
      {isOwner && <PermissionsRow group={group} onClick={() => go({ name: "permissions" })} />}
      <MemberList
        group={group}
        currentUserId={currentUserId}
        isOwner={isOwner}
        canAdd={canAddMembers(role)}
        onAddClick={() => go({ name: "add" })}
        onMemberClick={(clicked) => go({ name: "member", memberId: clicked.id })}
      />
      <LeaveGroupButton
        group={group}
        currentUserId={currentUserId}
        run={run}
        onLeave={() => details.leave()}
        onLeft={onLeft}
        onChooseSuccessor={() => go({ name: "leave" })}
      />
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
