import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import type { PublicUser } from "../types"

interface FriendPickerProps {
  friends: PublicUser[]
  selectedIds: ReadonlySet<string>
  onToggle: (userId: string) => void
  /** Plus aucune case ne peut être cochée (groupe complet). */
  isFull?: boolean
}

/**
 * Amis à cocher, pour créer un groupe ou y ajouter des membres. Cases à
 * cocher natives (clavier, lecteurs d'écran), habillées en lignes tactiles.
 */
export function FriendPicker({ friends, selectedIds, onToggle, isFull = false }: FriendPickerProps) {
  return (
    <fieldset className="flex min-h-0 flex-col gap-1.5">
      <legend className="mb-1.5 flex w-full justify-between px-1 text-sm font-medium">
        Membres
        <span className="font-normal text-muted-foreground tabular-nums">
          {selectedIds.size > 0 && `${selectedIds.size} sélectionné${selectedIds.size > 1 ? "s" : ""}`}
        </span>
      </legend>
      <ul className="-mx-2 min-h-0 overflow-y-auto overscroll-contain">
        {friends.map((friend) => {
          const isSelected = selectedIds.has(friend.id)
          return (
            <li key={friend.id}>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-2 transition-colors hover:bg-muted has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-50">
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={!isSelected && isFull}
                  onChange={() => onToggle(friend.id)}
                  className="peer sr-only"
                />
                <UserAvatar user={{ id: friend.id, name: friend.name, avatarUrl: friend.image ?? undefined }} />
                <span className="min-w-0 flex-1 truncate">{friend.name}</span>
                <span
                  aria-hidden
                  className="flex size-6 items-center justify-center rounded-full border-2 border-border text-transparent transition-colors peer-checked:border-voice peer-checked:bg-voice peer-checked:text-voice-foreground"
                >
                  <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={3} />
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

/** Sélection d'amis : cocher ou décocher un ami. */
export function toggleId(current: ReadonlySet<string>, userId: string): ReadonlySet<string> {
  const next = new Set(current)
  if (!next.delete(userId)) next.add(userId)
  return next
}
