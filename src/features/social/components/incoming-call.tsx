"use client"

import { useEffect, useEffectEvent } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { CallEnd01Icon, HeadsetIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button, buttonVariants } from "@/components/ui/button"
import { playSound } from "@/components/ui-sounds"
import { joinCallHref } from "@/features/auth/lib/routes"
import { VoiceHalo } from "@/features/chat/components/voice-halo"
import { getInitials } from "@/features/chat/lib/format"
import { authClient } from "@/lib/auth-client"
import { type IncomingCall, useIncomingCall } from "../hooks/use-incoming-call"
import { conversationHref } from "../lib/conversation"
import { declineFriendCall } from "../lib/socket"

/** La sonnerie se répète à ce rythme… */
const RING_INTERVAL_MS = 2500
/** …puis l'invitation se retire d'elle-même : l'appel reste visible sur l'accueil. */
const RING_DURATION_MS = 30_000

/**
 * Fait sonner les appels des amis et des groupes, sur toutes les pages, dès
 * qu'une session est ouverte (rien sur les pages de connexion).
 */
export function IncomingCallNotifier() {
  const { data: session } = authClient.useSession()
  if (!session) return null
  // `key` : changer de compte repart d'un état vierge.
  return <IncomingCallBanner key={session.user.id} currentUserId={session.user.id} />
}

function IncomingCallBanner({ currentUserId }: { currentUserId: string }) {
  const { incoming, dismiss } = useIncomingCall(currentUserId)
  const reduceMotion = useReducedMotion()
  const offset = reduceMotion ? 0 : -16

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-60 flex justify-center px-4"
    >
      <AnimatePresence>
        {incoming && (
          <motion.div
            key={incoming.id}
            initial={{ opacity: 0, y: offset, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: offset / 2 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto w-full max-w-sm"
          >
            <Ringing call={incoming} onDismiss={dismiss} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Ringing({ call, onDismiss }: { call: IncomingCall; onDismiss: () => void }) {
  const dismiss = useEffectEvent(onDismiss)
  const { conversation, startedBy } = call

  useEffect(() => {
    playSound("ring")
    const ring = setInterval(() => playSound("ring"), RING_INTERVAL_MS)
    const stop = setTimeout(() => dismiss(), RING_DURATION_MS)
    return () => {
      clearInterval(ring)
      clearTimeout(stop)
    }
  }, [call.id])

  const firstName = startedBy.name.split(" ")[0]
  const isDirect = conversation.type === "direct"

  // Entre amis, refuser arrête l'appel chez lui aussi ; en groupe, on ignore simplement le direct.
  function decline() {
    if (conversation.type === "direct") declineFriendCall(conversation.userId)
    onDismiss()
  }

  return (
    <div className="flex items-center gap-3 rounded-3xl border bg-background/95 p-2.5 pl-3 shadow-xl backdrop-blur-lg">
      <VoiceHalo size={40} tone="voice" isBreathing className="shrink-0 rounded-full">
        <span className="text-xs font-semibold">{getInitials(startedBy.name)}</span>
      </VoiceHalo>
      <p className="min-w-0 flex-1 text-sm">
        <span className="block truncate">
          <strong className="font-semibold">{firstName}</strong>
          {isDirect ? " vous appelle" : " lance un appel"}
        </span>
        {conversation.type === "group" && (
          <span className="block truncate text-xs text-muted-foreground">dans « {conversation.groupName} »</span>
        )}
      </p>
      {isDirect ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={decline}
          className="h-9 shrink-0 gap-1.5 rounded-full px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <HugeiconsIcon icon={CallEnd01Icon} size={16} strokeWidth={2} aria-hidden />
          Refuser
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={onDismiss} className="h-9 shrink-0 rounded-full px-3 text-muted-foreground">
          Ignorer
        </Button>
      )}
      <Link
        href={joinCallHref(conversationHref(conversation))}
        onClick={onDismiss}
        className={buttonVariants({
          size: "sm",
          className: "h-9 shrink-0 gap-1.5 rounded-full bg-voice px-3.5 text-voice-foreground hover:bg-voice/90",
        })}
      >
        <HugeiconsIcon icon={HeadsetIcon} size={16} strokeWidth={2} aria-hidden />
        {isDirect ? "Répondre" : "Rejoindre"}
      </Link>
    </div>
  )
}
