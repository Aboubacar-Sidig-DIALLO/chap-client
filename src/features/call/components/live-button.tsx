"use client"

import { HeadsetIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useCall } from "./call-provider"
import { LiveDot } from "./live-dot"

/**
 * Accès à l'appel depuis l'en-tête : appeler l'ami (ou lancer le direct du
 * groupe), puis y revenir une fois dedans. Un appel reçu ou un direct en
 * cours s'annonce dans le bandeau, pas ici.
 */
export function LiveButton({ disabled }: { disabled?: boolean }) {
  const { call, isDirect, title, isInCall, join, setIsExpanded } = useCall()

  if (isInCall) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="gap-2 rounded-full border-voice/40 text-voice hover:text-voice"
      >
        {call.status === "joining" ? <Spinner size={12} /> : <LiveDot />}
        {isDirect ? "Appel" : "Direct"}
      </Button>
    )
  }

  if (call.participants.length > 0) return null

  const label = isDirect ? `Appeler ${title}` : "Lancer un direct audio"

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={join}
      aria-label={label}
      title={isDirect ? label : "Lancer un direct : les autres le rejoignent quand ils veulent"}
      className="size-10 text-muted-foreground sm:size-9"
    >
      <HugeiconsIcon icon={HeadsetIcon} size={20} strokeWidth={1.8} />
    </Button>
  )
}
