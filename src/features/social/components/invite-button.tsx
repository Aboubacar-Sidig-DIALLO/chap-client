"use client"

import { Share08Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { useInvite } from "../hooks/use-invite"

/** Invite un proche à créer son compte (voir `useInvite`). */
export function InviteButton({ variant = "outline" }: { variant?: "outline" | "default" }) {
  const { invite, isCopied, label } = useInvite()

  return (
    <Button variant={variant} onClick={invite} aria-live="polite">
      <HugeiconsIcon icon={isCopied ? Tick02Icon : Share08Icon} strokeWidth={2} data-icon="inline-start" />
      {label}
    </Button>
  )
}
