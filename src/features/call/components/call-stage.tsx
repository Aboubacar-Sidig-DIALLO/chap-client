"use client"

import { ArrowShrink02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import {
  ReducedMotionConfig,
  spring,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useElapsed } from "../hooks/use-elapsed"
import {
  getLiveSince,
  getOrbSize,
  getParticipantStream,
  orderParticipants,
} from "../lib/participants"
import { CallControls } from "./call-controls"
import { useCall } from "./call-provider"
import { LiveDot } from "./live-dot"
import { ParticipantOrb } from "./participant-orb"

/**
 * La scène du direct, par-dessus la conversation : les participants en orbes
 * vocaux (ou bulles vidéo), une lueur couleur « voix », et les commandes.
 * Réduite, elle laisse place au mini-direct flottant.
 */
export function CallStage({ title }: { title: string }) {
  const { call, isInCall, isExpanded, setIsExpanded } = useCall()
  const rise = useTempoTransition(spring.dialog)
  const fade = useTempoTransition(transition.fade)
  const isOpen = isInCall && isExpanded

  return (
    <ReducedMotionConfig>
      <AnimatePresence>
        {isOpen && (
          <motion.section
            key="call-stage"
            aria-label={`Direct · ${title}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { ...rise, opacity: fade } }}
            exit={{ opacity: 0, y: 24, transition: fade }}
            className="absolute inset-0 z-40 flex flex-col bg-background bg-[radial-gradient(120%_60%_at_50%_0%,color-mix(in_oklch,var(--voice)_16%,transparent),transparent_70%)] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <StageHeader title={title} onMinimize={() => setIsExpanded(false)} />

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-8">
              {call.status === "joining" ? (
                <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner size={16} /> Connexion au direct…
                </p>
              ) : (
                <Participants />
              )}
            </div>

            <CallControls />
          </motion.section>
        )}
      </AnimatePresence>
    </ReducedMotionConfig>
  )
}

function StageHeader({ title, onMinimize }: { title: string; onMinimize: () => void }) {
  const { call } = useCall()
  const elapsed = useElapsed(getLiveSince(call.participants))
  const count = call.participants.length

  return (
    <header className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <LiveDot /> Direct
          <span className="truncate font-normal text-muted-foreground">· {title}</span>
        </h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {count} {count > 1 ? "personnes" : "personne"}
          {elapsed && ` · ${elapsed}`}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Réduire le direct et revenir à la conversation"
        onClick={onMinimize}
        className="size-10"
      >
        <HugeiconsIcon icon={ArrowShrink02Icon} size={20} strokeWidth={1.8} />
      </Button>
    </header>
  )
}

function Participants() {
  const { call, session } = useCall()
  const participants = orderParticipants(call.participants, call.selfId)
  const size = getOrbSize(participants.length)
  const pop = useTempoTransition(spring.pop)
  const move = useTempoTransition(spring.reflow)

  return (
    <ul className="flex max-w-xl flex-wrap items-start justify-center gap-x-10 gap-y-12">
      <AnimatePresence initial={false}>
        {participants.map((participant) => (
          <motion.li
            key={participant.peerId}
            // Un arrivant éclot, les autres se réarrangent autour de lui.
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, transition: pop }}
            exit={{ opacity: 0, scale: 0.8, transition: pop }}
            transition={move}
          >
            <ParticipantOrb
              participant={participant}
              isSelf={participant.peerId === call.selfId}
              stream={getParticipantStream(call, participant.peerId)}
              getLevel={session.levelReader(participant.peerId)}
              reactions={call.reactions.filter((item) => item.peerId === participant.peerId)}
              size={size}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
