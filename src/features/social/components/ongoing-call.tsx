"use client"

import Link from "next/link"
import { HeadsetIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { buttonVariants } from "@/components/ui/button"
import { joinCallHref } from "@/features/auth/lib/routes"
import { LiveDot } from "@/features/call/components/live-dot"
import { useElapsed } from "@/features/call/hooks/use-elapsed"
import { formatNameList } from "@/features/chat/lib/format"
import type { OngoingCall } from "../types"

/** « En appel · Léa et Tom · 3:12 », dans la couleur de la voix. */
export function OngoingCallLabel({ call }: { call: OngoingCall }) {
  const elapsed = useElapsed(call.startedAt)
  const names = formatNameList(call.participants.map((user) => user.name.split(" ")[0]))

  return (
    <span className="flex min-w-0 items-center gap-1.5 text-voice">
      <LiveDot />
      <span className="truncate">
        En appel · {names}
        {elapsed && <span className="tabular-nums"> · {elapsed}</span>}
      </span>
    </span>
  )
}

interface JoinCallLinkProps {
  /** Page de la conversation (ami ou groupe). */
  href: string
  /** Pour les lecteurs d'écran : « Rejoindre l'appel de Café ». */
  label: string
}

/** Rejoint l'appel en un geste : ouvre la conversation et entre dans l'appel. */
export function JoinCallLink({ href, label }: JoinCallLinkProps) {
  return (
    <Link
      href={joinCallHref(href)}
      aria-label={label}
      className={buttonVariants({
        size: "sm",
        className: "h-9 shrink-0 gap-1.5 rounded-full bg-voice px-3.5 text-voice-foreground hover:bg-voice/90",
      })}
    >
      <HugeiconsIcon icon={HeadsetIcon} size={16} strokeWidth={2} aria-hidden />
      Rejoindre
    </Link>
  )
}
