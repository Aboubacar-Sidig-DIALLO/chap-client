"use client"

import { useEffect } from "react"
import { Alert02Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import {
  ReducedMotionConfig,
  spring,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { Button } from "@/components/ui/button"
import { VoiceHalo } from "@/features/chat/components/voice-halo"
import { formatNameList, getInitials } from "@/features/chat/lib/format"
import { useCall } from "./call-provider"
import { LiveDot } from "./live-dot"

const MAX_ORBS = 3
/** Un message d'erreur s'efface de lui-même. */
const ERROR_DURATION_MS = 6000

/**
 * Bandeau sous l'en-tête : l'invitation à rejoindre un direct en cours (pas de
 * sonnerie, on y entre quand on veut), ou la raison d'un échec.
 * S'ouvre et se referme en hauteur (Animate UI, `interactions/banner.md`).
 */
export function LiveBanner() {
  const { call, isInCall } = useCall()
  const height = useTempoTransition(spring.height)
  const fade = useTempoTransition(transition.fade)

  const content = call.error ? "error" : !isInCall && call.participants.length > 0 ? "invite" : null

  return (
    <ReducedMotionConfig>
      <AnimatePresence initial={false}>
        {content && (
          <motion.div
            key="live-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { height, opacity: fade } }}
            exit={{ height: 0, opacity: 0, transition: { height, opacity: fade } }}
            className="overflow-hidden border-b"
          >
            {content === "error" ? <ErrorNotice /> : <Invite />}
          </motion.div>
        )}
      </AnimatePresence>
    </ReducedMotionConfig>
  )
}

function Invite() {
  const { call, join } = useCall()
  const { participants } = call
  const names = formatNameList(participants.map((participant) => participant.user.name))
  const verb = participants.length > 1 ? "sont" : "est"

  return (
    <div className="flex items-center gap-3 bg-voice/8 px-3 py-2 sm:px-4">
      {/* Pas de volume à mesurer hors du direct : les orbes respirent. */}
      <span aria-hidden className="flex -space-x-2">
        {participants.slice(0, MAX_ORBS).map((participant, index) => (
          <VoiceHalo
            key={participant.peerId}
            size={28}
            tone="voice"
            isBreathing={index === 0}
            className="rounded-full ring-2 ring-background"
          >
            <span className="text-[10px] font-semibold">{getInitials(participant.user.name)}</span>
          </VoiceHalo>
        ))}
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-voice">
          <LiveDot /> En direct
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {names} {verb} en train de parler
        </span>
      </p>
      <Button
        size="sm"
        onClick={join}
        className="rounded-full bg-voice px-4 text-voice-foreground hover:bg-voice/90"
      >
        Rejoindre
      </Button>
    </div>
  )
}

function ErrorNotice() {
  const { call, session } = useCall()

  useEffect(() => {
    if (!call.error) return
    const timer = setTimeout(session.dismissError, ERROR_DURATION_MS)
    return () => clearTimeout(timer)
  }, [call.error, session])

  return (
    <div role="alert" className="flex items-center gap-2.5 bg-destructive/8 px-3 py-2 text-sm text-destructive sm:px-4">
      <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={2} aria-hidden className="shrink-0" />
      <p className="min-w-0 flex-1">{call.error}</p>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Fermer"
        onClick={session.dismissError}
        className="size-8 text-destructive hover:text-destructive"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
      </Button>
    </div>
  )
}
