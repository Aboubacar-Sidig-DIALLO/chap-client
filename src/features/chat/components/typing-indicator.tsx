import { Mic01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"
import { formatNameList } from "../lib/format"
import type { ActiveUser } from "../types"
import { UserAvatar } from "./user-avatar"
import { VoiceBars } from "./voice-bars"

const DOT_DELAYS_MS = [0, 150, 300]

/** « Alice enregistre un vocal… », « Alice et Bob écrivent… ». */
function getActivityLabel(activeUsers: ActiveUser[], isRecording: boolean) {
  const users = activeUsers.filter(
    (item) => (item.activity === "recording") === isRecording
  )
  const names = formatNameList(users.map((item) => item.user.name))
  const isPlural = users.length > 1

  return isRecording
    ? `${names} ${isPlural ? "enregistrent" : "enregistre"} un vocal…`
    : `${names} ${isPlural ? "écrivent" : "écrit"}…`
}

/**
 * Ce que font les autres participants. L'enregistrement d'un vocal prime :
 * c'est l'activité principale d'un chat pensé pour la voix.
 */
interface TypingIndicatorProps {
  activeUsers: ActiveUser[]
  /** Avatar de celui qui écrit (groupe) ; inutile à deux, comme sur les messages. */
  showAuthor: boolean
}

export function TypingIndicator({ activeUsers, showAuthor }: TypingIndicatorProps) {
  if (activeUsers.length === 0) return null

  const recording = activeUsers.find((item) => item.activity === "recording")
  const isRecording = recording !== undefined
  const featured = recording ?? activeUsers[0]
  const label = getActivityLabel(activeUsers, isRecording)

  return (
    <Message align="start">
      {showAuthor && (
        <MessageAvatar>
          <UserAvatar user={featured.user} />
        </MessageAvatar>
      )}

      <MessageContent className="gap-1">
        <div
          role="status"
          aria-label={label}
          className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-4 py-3"
        >
          {isRecording ? (
            <>
              <HugeiconsIcon
                icon={Mic01Icon}
                size={16}
                strokeWidth={2}
                aria-hidden
                className="text-destructive motion-safe:animate-pulse"
              />
              <VoiceBars className="h-4 text-muted-foreground/60" />
            </>
          ) : (
            DOT_DELAYS_MS.map((delay) => (
              <span
                key={delay}
                aria-hidden
                className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))
          )}
        </div>
        <p aria-hidden className="px-1 text-xs text-muted-foreground">
          {label}
        </p>
      </MessageContent>
    </Message>
  )
}
