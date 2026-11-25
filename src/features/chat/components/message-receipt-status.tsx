"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { ScrollFade } from "@animate-ui/react/primitives/effects/scroll-fade"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getReceiptLabel, type MessageReceipt } from "../lib/receipts"
import type { ChatUser, MessageStatus } from "../types"
import { MessageStatusIcon, STATUS_CONFIG } from "./message-status-icon"
import { UserAvatar } from "./user-avatar"

interface MessageReceiptStatusProps {
  receipt: MessageReceipt
  /** Affiche le libellé en toutes lettres (dernier message envoyé). */
  showLabel?: boolean
}

/**
 * Statut d'un message envoyé. Dès qu'un participant l'a reçu ou lu, un survol
 * (ou un appui sur mobile) détaille qui l'a lu et qui l'a seulement reçu.
 */
export function MessageReceiptStatus({
  receipt,
  showLabel = false,
}: MessageReceiptStatusProps) {
  const { status, readBy, deliveredTo } = receipt
  const label = getReceiptLabel(receipt)
  const icon = (
    <MessageStatusIcon status={status} label={label} showLabel={showLabel} />
  )

  if (readBy.length === 0 && deliveredTo.length === 0) {
    return <span title={showLabel ? undefined : label}>{icon}</span>
  }

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={250}
        aria-label={`${label} — afficher le détail`}
        className="relative -m-1 rounded-md p-1 outline-none after:absolute after:-inset-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {icon}
      </PopoverTrigger>

      <PopoverContent side="top" align="end" className="w-60 divide-y">
        <ReceiptSection title="Lu par" status="read" users={readBy} />
        <ReceiptSection title="Distribué à" status="delivered" users={deliveredTo} />
        {readBy.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Pas encore lu
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

interface ReceiptSectionProps {
  title: string
  status: Extract<MessageStatus, "read" | "delivered">
  users: ChatUser[]
}

function ReceiptSection({ title, status, users }: ReceiptSectionProps) {
  if (users.length === 0) return null
  const { icon, className } = STATUS_CONFIG[status]

  return (
    <section className="p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <HugeiconsIcon
          icon={icon}
          size={14}
          strokeWidth={2}
          aria-hidden
          className={className}
        />
        {title}
        <span className="ml-auto tabular-nums">{users.length}</span>
      </h3>

      <ScrollFade asChild size={20} shrink={0} blur={0}>
        <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto">
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-2">
              <UserAvatar user={user} size="sm" />
              <span className="truncate">{user.name}</span>
            </li>
          ))}
        </ul>
      </ScrollFade>
    </section>
  )
}
