"use client"

import { useEffect } from "react"
import { Alert02Icon, Cancel01Icon, CallEnd01Icon, HeadsetIcon } from "@hugeicons/core-free-icons"
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
import type { ChatUser } from "@/features/chat/types"
import { useCall } from "./call-provider"
import { LiveDot } from "./live-dot"

const MAX_ORBS = 3
/** Un message d'erreur s'efface de lui-même. */
const ERROR_DURATION_MS = 6000

type BannerContent = "error" | "incoming" | "invite"

/**
 * Bandeau sous l'en-tête : l'appel d'un ami (répondre ou refuser),
 * l'invitation à rejoindre le direct d'un groupe (on y entre quand on veut),
 * ou la raison d'un échec.
 * S'ouvre et se referme en hauteur (Animate UI, `interactions/banner.md`).
 */
export function LiveBanner() {
  const { call, isDirect, isInCall, currentUserId } = useCall()
  const height = useTempoTransition(spring.height)
  const fade = useTempoTransition(transition.fade)

  // Entre amis, un appel lancé depuis votre autre onglet ne vous sonne pas.
  const isOwnCall = call.participants.some((participant) => participant.user.id === currentUserId)
  const hasOngoingCall = !isInCall && call.participants.length > 0 && !(isDirect && isOwnCall)
  const caller = call.participants[0]?.user
  const content: BannerContent | null = call.error
    ? "error"
    : hasOngoingCall
      ? isDirect
        ? "incoming"
        : "invite"
      : null

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
            {content === "error" ? <ErrorNotice /> : content === "incoming" && caller ? (
              <IncomingCall caller={caller} />
            ) : (
              <Invite />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ReducedMotionConfig>
  )
}

/**
 * Un ami vous appelle, conversation ouverte : répondre ou refuser, comme au téléphone.
 * `caller` est reçu en prop, pas relu dans l'appel : quand l'appel prend fin, le
 * bandeau se referme en gardant le nom affiché, alors que l'appel n'a déjà plus
 * de participants.
 */
function IncomingCall({ caller }: { caller: ChatUser }) {
  const { session, join } = useCall()

  return (
    <div className="flex items-center gap-3 bg-voice/8 px-3 py-2 sm:px-4">
      <span aria-hidden className="flex">
        <VoiceHalo size={28} tone="voice" isBreathing className="rounded-full">
          <span className="text-[10px] font-semibold">{getInitials(caller.name)}</span>
        </VoiceHalo>
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-voice">
          <LiveDot /> Appel entrant
        </span>
        <span className="block truncate text-xs text-muted-foreground">{caller.name} vous appelle</span>
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={session.decline}
        aria-label={`Refuser l'appel de ${caller.name}`}
        className="gap-1.5 rounded-full px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <HugeiconsIcon icon={CallEnd01Icon} size={16} strokeWidth={2} aria-hidden />
        <span className="max-sm:sr-only">Refuser</span>
      </Button>
      <Button
        size="sm"
        onClick={join}
        className="gap-1.5 rounded-full bg-voice px-4 text-voice-foreground hover:bg-voice/90"
      >
        <HugeiconsIcon icon={HeadsetIcon} size={16} strokeWidth={2} aria-hidden />
        Répondre
      </Button>
    </div>
  )
}

/** Direct de groupe en cours : on le rejoint quand on veut (pas de sonnerie). */
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
