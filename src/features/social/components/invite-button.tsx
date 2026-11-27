"use client"

import { useState } from "react"
import { QrCodeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { InviteFriendDialog } from "@/features/invites/components/invite-friend-dialog"

interface InviteButtonProps extends Pick<React.ComponentProps<typeof Button>, "variant" | "size" | "className"> {
  label?: string
}

/**
 * Invite quelqu'un à devenir ami, par QR code ou lien valable une minute.
 * Sans compte, il en crée un, puis revient à l'invitation.
 */
export function InviteButton({ variant = "outline", label = "Inviter un ami", ...props }: InviteButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant={variant} onClick={() => setIsOpen(true)} {...props}>
        <HugeiconsIcon icon={QrCodeIcon} strokeWidth={2} data-icon="inline-start" />
        {label}
      </Button>
      <InviteFriendDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
