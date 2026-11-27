"use client"

import { PlayIcon, VolumeHighIcon, VolumeMute02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { LiveDot } from "@/features/call/components/live-dot"
import { useTalkie } from "./talkie-provider"
import { LiveLevelBars } from "./live-level-bars"

interface LiveTalkBubbleProps {
  /** Avatar de celui qui parle (groupe) ; inutile à deux, comme sur les messages. */
  showAuthor: boolean
}

/**
 * Quelqu'un vous parle en direct : une bulle « en direct » à la place du
 * futur vocal, qui suit sa voix. Le vocal prend sa place dès qu'il relâche.
 */
export function LiveTalkBubble({ showAuthor }: LiveTalkBubbleProps) {
  const { incoming, isMuted, needsTap, isSuppressed, session } = useTalkie()
  if (!incoming) return null

  const { user } = incoming
  const isAudible = !isMuted && !isSuppressed && !needsTap
  const label = isSuppressed
    ? `${user.name} parle en direct · vous l'entendrez dans son vocal`
    : isMuted
      ? `${user.name} parle en direct · son coupé`
      : `${user.name} vous parle en direct`

  return (
    <Message align="start">
      {showAuthor && (
        <MessageAvatar>
          <UserAvatar user={user} />
        </MessageAvatar>
      )}

      <MessageContent className="gap-1">
        <div className="listen-card flex w-fit items-center gap-3 rounded-2xl rounded-bl-md py-2 pr-2 pl-4" data-listen="live">
          {needsTap && !isMuted && !isSuppressed ? (
            // Le navigateur n'a pas encore permis le son : un geste suffit.
            <Button type="button" size="sm" onClick={session.resume} className="rounded-full">
              <HugeiconsIcon icon={PlayIcon} size={14} strokeWidth={2} aria-hidden />
              Touchez pour écouter
            </Button>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase">
                <LiveDot className="[&>span]:bg-tone" />
                En direct
              </span>
              <LiveLevelBars getLevel={isAudible ? session.getIncomingLevel : undefined} className="h-5" />
            </>
          )}

          {!isSuppressed && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => session.setMuted(!isMuted)}
              aria-pressed={isMuted}
              aria-label={isMuted ? "Réactiver le son des directs" : "Couper le son des directs"}
              className="rounded-full text-current hover:bg-tone/15"
            >
              <HugeiconsIcon icon={isMuted ? VolumeMute02Icon : VolumeHighIcon} size={16} strokeWidth={2} />
            </Button>
          )}
        </div>
        <p role="status" className="px-1 text-xs text-muted-foreground">
          {label}
        </p>
      </MessageContent>
    </Message>
  )
}
