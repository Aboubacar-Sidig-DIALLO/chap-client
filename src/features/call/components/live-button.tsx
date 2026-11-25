"use client"

import { HeadsetIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useCall } from "./call-provider"
import { LiveDot } from "./live-dot"

/**
 * Accès au direct depuis l'en-tête : le lancer quand personne n'y est, y
 * revenir quand on y est. (Un direct en cours s'annonce dans le bandeau.)
 */
export function LiveButton({ disabled }: { disabled?: boolean }) {
  const { call, isInCall, join, setIsExpanded } = useCall()

  if (isInCall) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="gap-2 rounded-full border-voice/40 text-voice hover:text-voice"
      >
        {call.status === "joining" ? <Spinner size={12} /> : <LiveDot />}
        Direct
      </Button>
    )
  }

  if (call.participants.length > 0) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={join}
      aria-label="Lancer un direct audio"
      title="Lancer un direct : les autres le rejoignent quand ils veulent"
      className="size-10 text-muted-foreground sm:size-9"
    >
      <HugeiconsIcon icon={HeadsetIcon} size={20} strokeWidth={1.8} />
    </Button>
  )
}
