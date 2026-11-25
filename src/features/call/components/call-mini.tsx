"use client"

import { ArrowExpand01Icon, CallEnd01Icon, Mic01Icon, MicOff01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { transition, useTempoTransition } from "@animate-ui/react/utils/motion"
import { Float } from "@/components/float"
import { Button } from "@/components/ui/button"
import { VoiceHalo } from "@/features/chat/components/voice-halo"
import { getInitials } from "@/features/chat/lib/format"
import { useElapsed } from "../hooks/use-elapsed"
import { getLiveSince, orderParticipants } from "../lib/participants"
import { useCall } from "./call-provider"
import { LiveDot } from "./live-dot"

const MAX_ORBS = 3

/**
 * Mini-direct (Hairline UI `Float`) : la scène réduite, pour écrire pendant
 * qu'on parle. Les orbes continuent de vibrer avec les voix ; on le lance vers
 * un coin ou on le range contre un bord.
 */
export function CallMini() {
  const { call, isInCall, isExpanded } = useCall()
  const fade = useTempoTransition(transition.fade)

  return (
    // Fondu d'opacité seulement : une transformation fausserait la position de `Float`.
    <AnimatePresence>
      {isInCall && !isExpanded && (
        <motion.div
          key="call-mini"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: fade }}
          exit={{ opacity: 0, transition: fade }}
        >
          <Float
            scope="container"
            defaultCorner="top-left"
            margin={12}
            storageKey="chat:call-mini"
            label="Direct en cours"
            live={call.status === "joined"}
            edgePeek={<LiveDot className="size-2.5" />}
          >
            <MiniCard />
          </Float>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MiniCard() {
  const { call, session, setIsExpanded } = useCall()
  const elapsed = useElapsed(getLiveSince(call.participants))
  const participants = orderParticipants(call.participants, call.selfId)
  const hiddenCount = participants.length - MAX_ORBS

  return (
    <div className="flex items-center gap-2 rounded-full border bg-card/95 p-1.5 pr-2 shadow-xl backdrop-blur-lg">
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        aria-label="Ouvrir le direct"
        className="flex items-center gap-2 rounded-full pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span aria-hidden className="flex -space-x-2 py-1 pl-1">
          {participants.slice(0, MAX_ORBS).map((participant) => (
            <VoiceHalo
              key={participant.peerId}
              size={30}
              tone={participant.audio ? "voice" : "muted"}
              getLevel={participant.audio ? session.levelReader(participant.peerId) : undefined}
              className="rounded-full ring-2 ring-card"
            >
              <span className="text-[11px] font-semibold">{getInitials(participant.user.name)}</span>
            </VoiceHalo>
          ))}
          {hiddenCount > 0 && (
            <span className="relative grid size-7.5 place-items-center rounded-full bg-muted text-[11px] font-medium ring-2 ring-card">
              +{hiddenCount}
            </span>
          )}
        </span>
        <span className="text-left leading-tight">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <LiveDot /> Direct
          </span>
          <span className="block text-xs text-muted-foreground tabular-nums">{elapsed}</span>
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon-sm"
        role="switch"
        aria-checked={!call.isMuted}
        aria-label="Micro"
        disabled={call.status !== "joined"}
        onClick={session.toggleMute}
        className={call.isMuted ? "size-9 text-destructive" : "size-9"}
      >
        <HugeiconsIcon icon={call.isMuted ? MicOff01Icon : Mic01Icon} size={18} strokeWidth={1.8} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Ouvrir le direct en grand"
        onClick={() => setIsExpanded(true)}
        className="hidden size-9 sm:grid"
      >
        <HugeiconsIcon icon={ArrowExpand01Icon} size={18} strokeWidth={1.8} />
      </Button>
      <Button
        size="icon-sm"
        aria-label="Quitter le direct"
        onClick={session.leave}
        className="size-9 bg-destructive text-white hover:bg-destructive/90"
      >
        <HugeiconsIcon icon={CallEnd01Icon} size={18} strokeWidth={1.8} />
      </Button>
    </div>
  )
}
