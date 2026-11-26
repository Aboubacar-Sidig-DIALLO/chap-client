"use client"

import { UserRemove01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ROUTES } from "@/features/auth/lib/routes"
import { formatPresence } from "../lib/presence"
import type { Friend } from "../types"
import { REVEAL_ON_HOVER } from "./list-row"
import { FriendCallLabel, JoinCallLink } from "./ongoing-call"
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

/**
 * Un ami : sa présence ou votre appel en cours, la conversation en un clic.
 * Un appel entre amis n'existe sans vous que s'il vous appelle : « Répondre ».
 */
export function FriendRow({ friend, currentUserId, now, isActive, unreadCount, onRemove }: FriendRowProps) {
  const isIncomingCall =
    friend.call !== null && !friend.call.participants.some((participant) => participant.id === currentUserId)

  return (
    <PersonRow
      user={friend}
      href={ROUTES.friend(friend.id)}
      isActive={isActive}
      presence={friend.presence}
      description={
        friend.call ? (
          <FriendCallLabel call={friend.call} isIncoming={isIncomingCall} />
        ) : (
          <span className={friend.presence.online ? "text-emerald-600 dark:text-emerald-400" : undefined}>
            {formatPresence(friend.presence, now)}
          </span>
        )
      }
      unreadCount={unreadCount}
      actions={
        <>
          {isIncomingCall && (
            <JoinCallLink href={ROUTES.friend(friend.id)} label={`Répondre à l'appel de ${friend.name}`}>
              Répondre
            </JoinCallLink>
          )}
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
