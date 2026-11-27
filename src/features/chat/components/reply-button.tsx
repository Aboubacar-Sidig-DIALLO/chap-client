"use client"

import { ArrowTurnBackwardIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"
import { voiceOf } from "../lib/replies"
import type { ChatMessage } from "../types"
import { useReply } from "./reply-provider"
import { useVoicePlayback } from "./voice-playback"

interface ReplyButtonProps {
  message: ChatMessage
  /** Le message est à droite (les siens) : la flèche pointe vers lui depuis la gauche. */
  isOwn: boolean
}

/**
 * Flèche « Répondre », toujours visible à côté du message (discrète, elle
 * s'affirme au survol). Sur un vocal entamé — on a touché l'onde à 0:42, ou
 * on l'a mis en pause là —, la réponse cite ce passage ; on peut ensuite
 * l'élargir au vocal entier depuis la barre de réponse.
 */
export function ReplyButton({ message, isOwn }: ReplyButtonProps) {
  const { canReply, startReply } = useReply()
  const playback = useVoicePlayback()
  if (!canReply) return null

  function reply() {
    const atMs = voiceOf(message) ? playback.getPosition(message.id) : null
    startReply(message, atMs ?? undefined)
  }

  return (
    <button
      type="button"
      onClick={reply}
      aria-label="Répondre"
      title="Répondre"
      className={cn(
        "press grid size-8 shrink-0 place-items-center rounded-full outline-none",
        "text-muted-foreground/60 transition-colors group-hover/reactable:text-muted-foreground",
        "hover:bg-muted hover:text-foreground! focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      )}
    >
      {/* Pointe vers la bulle : à gauche pour les messages reçus, à droite pour les siens. */}
      <HugeiconsIcon
        icon={ArrowTurnBackwardIcon}
        size={18}
        strokeWidth={1.8}
        aria-hidden
        className={cn(isOwn && "-scale-x-100")}
      />
    </button>
  )
}
