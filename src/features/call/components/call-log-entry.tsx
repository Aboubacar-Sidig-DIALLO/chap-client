"use client"

import { CallEnd01Icon, CallMissed02Icon, HeadsetIcon, Video01Icon } from "@hugeicons/core-free-icons"
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

/** Comment l'utilisateur a vécu cet appel. */
type CallOutcome =
  /** Il y était, avec d'autres. */
  | "attended"
  /** Il n'y était pas (et ne l'a pas refusé). */
  | "missed"
  /** Il l'a lancé, personne ne l'a rejoint (ou, entre amis, n'a répondu). */
  | "alone"
  /** Entre amis : l'appel a été refusé, par lui ou par l'autre. */
  | "declined"

function getOutcome(call: CallSummary, currentUserId: string): CallOutcome {
  if (call.participants.length > 1) {
    return call.participants.some((user) => user.id === currentUserId) ? "attended" : "missed"
  }
  if (call.declined) return "declined"
  return call.participants[0].id === currentUserId ? "alone" : "missed"
}

const OUTCOME_STYLE: Record<CallOutcome, string> = {
  attended: "bg-voice/12 text-voice",
  missed: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  alone: "bg-muted text-muted-foreground",
  declined: "bg-muted text-muted-foreground",
}

function getIcon(call: CallSummary, outcome: CallOutcome) {
  if (outcome === "missed") return CallMissed02Icon
  if (outcome === "declined") return CallEnd01Icon
  return call.hadVideo ? Video01Icon : HeadsetIcon
}

interface CallText {
  title: string
  /** Absente quand le titre dit tout (« Appel audio manqué »). */
  description: string | null
}

/**
 * Appel entre amis : comme au téléphone, pas de liste de participants (on sait
 * avec qui), seulement ce qui s'est passé et le temps de conversation.
 */
function describeDirectCall(call: CallSummary, outcome: CallOutcome, isCaller: boolean): CallText {
  const kind = call.hadVideo ? "vidéo" : "audio"
  switch (outcome) {
    case "attended":
      return { title: `Appel ${kind}`, description: formatCallDuration(call.durationMs) }
    case "missed":
      return { title: `Appel ${kind} manqué`, description: null }
    case "alone":
      return { title: `Appel ${kind}`, description: "Sans réponse" }
    case "declined":
      return isCaller
        ? { title: `Appel ${kind}`, description: "Refusé" }
        : { title: `Appel ${kind} refusé`, description: null }
  }
}

/** Direct de groupe : sa durée et qui y était. */
function describeGroupLive(call: CallSummary, outcome: CallOutcome, currentUserId: string): CallText {
  const kind = call.hadVideo ? "vidéo" : "audio"
  const duration = formatCallDuration(call.durationMs)
  const others = call.participants.filter((user) => user.id !== currentUserId)
  const names = formatNameList(others.map((user) => user.name))

  switch (outcome) {
    case "attended":
      return { title: `Direct ${kind}`, description: `${duration} · avec ${names}` }
    // « Manqué » est dans le titre : on dit seulement qui y était.
    case "missed":
    case "declined":
      return { title: `Direct ${kind} manqué`, description: `${names} · ${duration}` }
    case "alone":
      return { title: `Direct ${kind}`, description: `Personne n'a rejoint · ${duration}` }
  }
}

interface CallLogEntryProps {
  call: CallSummary
  currentUserId: string
  /** Trace arrivée en direct : elle entre en scène. */
  animateIn: boolean
  /** Dernière trace du fil : elle seule propose de rappeler. */
  isLatest: boolean
}

/**
 * Trace d'un appel terminé, placée comme un message de celui qui l'a lancé :
 * à droite si c'est vous, à gauche sinon. Elle dit s'il était audio ou vidéo,
 * ce qui s'est passé (manqué, refusé, sans réponse) et sa durée ; en groupe,
 * qui y était. La dernière trace propose de rappeler (ou de relancer le direct).
 */
export function CallLogEntry({ call, currentUserId, animateIn, isLatest }: CallLogEntryProps) {
  const { isDirect, title: conversationTitle, isInCall, call: live, join } = useCall()
  const rise = useTempoTransition(spring.entrance)
  const fade = useTempoTransition(transition.fade)

  const initiator = call.participants[0]
  const isOwn = initiator.id === currentUserId
  const outcome = getOutcome(call, currentUserId)
  const { title, description } = isDirect
    ? describeDirectCall(call, outcome, isOwn)
    : describeGroupLive(call, outcome, currentUserId)
  const timeRange = formatTimeRange(call.startedAt, call.endedAt)
  // Rappeler : sur la dernière trace, et seulement quand aucun appel n'est en cours.
  const canRestart = isLatest && !isInCall && live.participants.length === 0

  return (
    <motion.div
      initial={animateIn ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0, transition: { ...rise, opacity: fade } }}
    >
      <Message align={isOwn ? "end" : "start"}>
        {/* Entre amis, pas d'avatar : on sait de qui vient l'appel. */}
        {!isOwn && !isDirect && (
          // Aligné sur la carte (au-dessus de l'heure), comme pour un message.
          <MessageAvatar className="group-has-data-[slot=message-footer]/message:-translate-y-5">
            <UserAvatar user={initiator} />
          </MessageAvatar>
        )}

        {/* `@container` : la largeur max. de la carte suit la colonne, comme une bulle. */}
        <MessageContent className="@container gap-1">
          <article
            // `data-slot` : aligné à droite par `MessageContent` quand l'appel vient de vous.
            data-slot="call-log"
            aria-label={[title, description, timeRange].filter(Boolean).join(", ")}
            className={cn(
              "flex w-fit max-w-[85cqw] items-center gap-3 rounded-2xl border bg-card py-2.5 pr-2.5 pl-3 shadow-xs sm:max-w-[75cqw]",
              // Le coin « bulle » indique de quel côté vient l'appel.
              isOwn ? "rounded-br-md" : "rounded-bl-md"
            )}
          >
            <span
              aria-hidden
              className={cn("grid size-10 shrink-0 place-items-center rounded-full", OUTCOME_STYLE[outcome])}
            >
              <HugeiconsIcon icon={getIcon(call, outcome)} size={18} strokeWidth={1.8} />
            </span>

            <div aria-hidden className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{title}</p>
              {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
            </div>

            {canRestart ? (
              <Button
                size="sm"
                onClick={join}
                aria-label={isDirect ? `Rappeler ${conversationTitle}` : "Relancer un direct"}
                className="shrink-0 rounded-full bg-voice px-3 text-voice-foreground hover:bg-voice/90"
              >
                {isDirect ? "Rappeler" : "Relancer"}
              </Button>
            ) : (
              !isDirect && (
                <span aria-hidden className="flex shrink-0 -space-x-1.5">
                  {call.participants.slice(0, MAX_AVATARS).map((user) => (
                    <UserAvatar key={user.id} user={user} size="sm" className="ring-2 ring-card" />
                  ))}
                </span>
              )
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
