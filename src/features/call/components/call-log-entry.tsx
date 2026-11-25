"use client"

import { CallMissed02Icon, HeadsetIcon, Video01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion } from "motion/react"
import { spring, transition, useTempoTransition } from "@animate-ui/react/utils/motion"
import { Button } from "@/components/ui/button"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message"
import { cn } from "@/lib/utils"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { formatCallDuration, formatNameList, formatTimeRange } from "@/features/chat/lib/format"
import type { CallSummary } from "../types"
import { useCall } from "./call-provider"

const MAX_AVATARS = 4

/** Comment l'utilisateur a vécu ce direct. */
type CallOutcome =
  /** Il y était, avec d'autres. */
  | "attended"
  /** Il n'y était pas. */
  | "missed"
  /** Il l'a lancé, personne ne l'a rejoint. */
  | "alone"

function getOutcome(call: CallSummary, currentUserId: string): CallOutcome {
  const wasThere = call.participants.some((user) => user.id === currentUserId)
  if (!wasThere) return "missed"
  return call.participants.length > 1 ? "attended" : "alone"
}

const OUTCOME_STYLE: Record<CallOutcome, string> = {
  attended: "bg-voice/12 text-voice",
  missed: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  alone: "bg-muted text-muted-foreground",
}

function describe(call: CallSummary, outcome: CallOutcome, currentUserId: string) {
  const duration = formatCallDuration(call.durationMs)
  const others = call.participants.filter((user) => user.id !== currentUserId)
  const names = formatNameList(others.map((user) => user.name))

  switch (outcome) {
    case "attended":
      return `${duration} · avec ${names}`
    // « Manqué » est dans le titre : on dit seulement qui y était.
    case "missed":
      return `${names} · ${duration}`
    case "alone":
      return `Personne n'a rejoint · ${duration}`
  }
}

interface CallLogEntryProps {
  call: CallSummary
  currentUserId: string
  /** Trace arrivée en direct : elle entre en scène. */
  animateIn: boolean
  /** Dernière trace du fil : elle seule propose de relancer. */
  isLatest: boolean
}

/**
 * Trace d'un direct terminé, placée comme un message de celui qui l'a lancé :
 * à droite si c'est vous, à gauche (avec son avatar) sinon. Elle dit s'il était
 * audio ou vidéo, sa durée, qui y était, et si vous l'avez manqué ; la
 * dernière trace propose de relancer un direct.
 */
export function CallLogEntry({ call, currentUserId, animateIn, isLatest }: CallLogEntryProps) {
  const { isInCall, call: live, join } = useCall()
  const rise = useTempoTransition(spring.entrance)
  const fade = useTempoTransition(transition.fade)

  const initiator = call.participants[0]
  const isOwn = initiator.id === currentUserId
  const outcome = getOutcome(call, currentUserId)
  const kind = call.hadVideo ? "vidéo" : "audio"
  const title = outcome === "missed" ? `Direct ${kind} manqué` : `Direct ${kind}`
  const description = describe(call, outcome, currentUserId)
  const timeRange = formatTimeRange(call.startedAt, call.endedAt)
  // Relancer : sur la dernière trace, et seulement quand aucun direct n'est en cours.
  const canRestart = isLatest && !isInCall && live.participants.length === 0

  return (
    <motion.div
      initial={animateIn ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0, transition: { ...rise, opacity: fade } }}
    >
      <Message align={isOwn ? "end" : "start"}>
        {!isOwn && (
          // Aligné sur la carte (au-dessus de l'heure), comme pour un message.
          <MessageAvatar className="group-has-data-[slot=message-footer]/message:-translate-y-5">
            <UserAvatar user={initiator} />
          </MessageAvatar>
        )}

        {/* `@container` : la largeur max. de la carte suit la colonne, comme une bulle. */}
        <MessageContent className="@container gap-1">
          <article
            // `data-slot` : aligné à droite par `MessageContent` quand le direct vient de vous.
            data-slot="call-log"
            aria-label={`${title}, ${description}, ${timeRange}`}
            className={cn(
              "flex w-fit max-w-[85cqw] items-center gap-3 rounded-2xl border bg-card py-2.5 pr-2.5 pl-3 shadow-xs sm:max-w-[75cqw]",
              // Le coin « bulle » indique de quel côté vient le direct.
              isOwn ? "rounded-br-md" : "rounded-bl-md"
            )}
          >
            <span
              aria-hidden
              className={cn("grid size-10 shrink-0 place-items-center rounded-full", OUTCOME_STYLE[outcome])}
            >
              <HugeiconsIcon
                icon={outcome === "missed" ? CallMissed02Icon : call.hadVideo ? Video01Icon : HeadsetIcon}
                size={18}
                strokeWidth={1.8}
              />
            </span>

            <div aria-hidden className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            </div>

            {canRestart ? (
              <Button
                size="sm"
                onClick={join}
                aria-label="Relancer un direct"
                className="shrink-0 rounded-full bg-voice px-3 text-voice-foreground hover:bg-voice/90"
              >
                Relancer
              </Button>
            ) : (
              <span aria-hidden className="flex shrink-0 -space-x-1.5">
                {call.participants.slice(0, MAX_AVATARS).map((user) => (
                  <UserAvatar key={user.id} user={user} size="sm" className="ring-2 ring-card" />
                ))}
              </span>
            )}
          </article>

          <MessageFooter>
            <time dateTime={call.startedAt} suppressHydrationWarning className="tabular-nums">
              {timeRange}
            </time>
          </MessageFooter>
        </MessageContent>
      </Message>
    </motion.div>
  )
}
