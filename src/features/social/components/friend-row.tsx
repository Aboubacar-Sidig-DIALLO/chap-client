"use client"

import { UserRemove01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ROUTES } from "@/features/auth/lib/routes"
import { formatPresence } from "../lib/presence"
import type { Friend } from "../types"
import { REVEAL_ON_HOVER } from "./list-row"
import { JoinCallLink, OngoingCallLabel } from "./ongoing-call"
import { PersonRow } from "./person-row"

interface FriendRowProps {
  friend: Friend
  currentUserId: string
  /** Heure de référence de « Hors ligne depuis 5 min ». */
  now: number
  isActive: boolean
  unreadCount: number
  onRemove: (userId: string) => Promise<unknown>
}

/** Un ami : sa présence ou son appel en cours, la conversation en un clic. */
export function FriendRow({ friend, currentUserId, now, isActive, unreadCount, onRemove }: FriendRowProps) {
  const canJoinCall = friend.call && !friend.call.participants.some((participant) => participant.id === currentUserId)

  return (
    <PersonRow
      user={friend}
      href={ROUTES.friend(friend.id)}
      isActive={isActive}
      presence={friend.presence}
      description={
        friend.call ? (
          <OngoingCallLabel call={friend.call} />
        ) : (
          <span className={friend.presence.online ? "text-emerald-600 dark:text-emerald-400" : undefined}>
            {formatPresence(friend.presence, now)}
          </span>
        )
      }
      unreadCount={unreadCount}
      actions={
        <>
          {canJoinCall && <JoinCallLink href={ROUTES.friend(friend.id)} label={`Rejoindre l'appel de ${friend.name}`} />}
          <ConfirmDialog
            trigger={<HugeiconsIcon icon={UserRemove01Icon} size={18} strokeWidth={2} />}
            triggerLabel={`Retirer ${friend.name} de vos amis`}
            triggerClassName={REVEAL_ON_HOVER}
            title={`Retirer ${friend.name} de vos amis ?`}
            description="Vous pourrez lui renvoyer une demande plus tard."
            confirmLabel="Retirer"
            onConfirm={() => void onRemove(friend.id)}
          />
        </>
      }
    />
  )
}
