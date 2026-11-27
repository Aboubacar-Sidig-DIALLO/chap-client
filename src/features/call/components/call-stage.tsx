"use client"

import { ArrowShrink02Icon, UserAdd01Icon } from "@hugeicons/core-free-icons"
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
  isRinging,
  orderParticipants,
} from "../lib/participants"
import { CallControls } from "./call-controls"
import { useCall } from "./call-provider"
import { LiveDot } from "./live-dot"
import { ParticipantOrb } from "./participant-orb"

/**
 * La scène de l'appel, par-dessus la conversation : les participants en orbes
 * vocaux (ou bulles vidéo), une lueur couleur « voix », et les commandes.
 * Réduite, elle laisse place au mini-appel flottant.
 */
export function CallStage() {
  const { call, isDirect, title, isInCall, isExpanded, setIsExpanded } = useCall()
  const rise = useTempoTransition(spring.dialog)
  const fade = useTempoTransition(transition.fade)
  const isOpen = isInCall && isExpanded

  return (
    <ReducedMotionConfig>
      <AnimatePresence>
        {isOpen && (
          <motion.section
            key="call-stage"
            aria-label={isDirect ? `Appel avec ${title}` : `Direct · ${title}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { ...rise, opacity: fade } }}
            exit={{ opacity: 0, y: 24, transition: fade }}
            className="absolute inset-0 z-40 flex flex-col bg-background bg-[radial-gradient(120%_60%_at_50%_0%,color-mix(in_oklch,var(--voice)_16%,transparent),transparent_70%)] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <StageHeader onMinimize={() => setIsExpanded(false)} />

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-8">
              {call.status === "joining" ? (
                <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner size={16} /> {isDirect ? "Connexion…" : "Connexion au direct…"}
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

function StageHeader({ onMinimize }: { onMinimize: () => void }) {
  const { isDirect, isGuest, guestControls, call } = useCall()

  return (
    <header className="flex items-center gap-1">
      <div className="mr-2 min-w-0 flex-1">{isDirect ? <DirectCallHeading /> : <GroupLiveHeading />}</div>
      {/* Propriétaire ou administrateur : faire venir quelqu'un d'extérieur, le temps de l'appel. */}
      {guestControls && !isDirect && (
        <Button
          variant="ghost"
          size="sm"
          onClick={guestControls.onInvite}
          disabled={call.status !== "joined"}
          className="h-10 text-voice"
        >
          <HugeiconsIcon icon={UserAdd01Icon} size={18} strokeWidth={1.8} data-icon="inline-start" />
          Inviter
        </Button>
      )}
      {/* Un invité n'a pas de conversation à laquelle revenir : l'appel est tout ce qu'il voit. */}
      {!isGuest && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={isDirect ? "Réduire l'appel et revenir à la conversation" : "Réduire le direct et revenir à la conversation"}
          onClick={onMinimize}
          className="size-10"
        >
          <HugeiconsIcon icon={ArrowShrink02Icon} size={20} strokeWidth={1.8} />
        </Button>
      )}
    </header>
  )
}

/** Appel entre amis : son nom, puis « Ça sonne… » jusqu'à la réponse, et le temps écoulé. */
function DirectCallHeading() {
  const { call, title } = useCall()
  const elapsed = useElapsed(getLiveSince(call.participants, true))
  const status = isRinging(call.participants, true) ? "Ça sonne…" : elapsed

  return (
    <>
      <h2 className="truncate text-base font-semibold">{title}</h2>
      <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
        <LiveDot /> {status ?? "Appel"}
      </p>
    </>
  )
}

/** Direct de groupe : le groupe, combien y sont, et depuis quand. */
function GroupLiveHeading() {
  const { call, title, isGuest } = useCall()
  const elapsed = useElapsed(getLiveSince(call.participants, false))
  const count = call.participants.length

  return (
    <>
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <LiveDot /> Direct
        <span className="truncate font-normal text-muted-foreground">· {title}</span>
      </h2>
      <p className="text-xs text-muted-foreground tabular-nums">
        {count} {count > 1 ? "personnes" : "personne"}
        {elapsed && ` · ${elapsed}`}
        {isGuest && " · vous êtes invité"}
      </p>
    </>
  )
}

function Participants() {
  const { call, session, guestControls } = useCall()
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
              onRemove={
                guestControls && participant.user.isGuest
                  ? () => guestControls.onRemove(participant.peerId)
                  : undefined
              }
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
