"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { AnimateIcon } from "@animate-ui/react/icons"
import { Effect } from "@animate-ui/react/primitives/effects/effect"
import { ScrollFade } from "@animate-ui/react/primitives/effects/scroll-fade"
import {
  blur,
  ReducedMotionConfig,
  scale,
  spring,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { ArrowDown02 } from "@/components/animate-ui/icons/hugeicons/arrow-down-02"
import { Mic } from "@/components/animate-ui/icons/hugeicons/mic"
import { Button } from "@/components/ui/button"
import { MessageGroup } from "@/components/ui/message"
import { CallLogEntry } from "@/features/call/components/call-log-entry"
import { usePageVisible } from "../hooks/use-page-visible"
import { useStickToBottom } from "../hooks/use-stick-to-bottom"
import type { ReactionEmoji } from "../lib/config"
import { formatDayLabel } from "../lib/format"
import { groupMessages } from "../lib/group-messages"
import type { ActiveUser, ChatMessage, ReadReceipt } from "../types"
import { ChatMessageGroup } from "./chat-message-group"
import { TypingIndicator } from "./typing-indicator"
import { UnreadBadge } from "./unread-badge"

interface MessageListProps {
  messages: ChatMessage[]
  /** `false` tant que le premier historique n'est pas arrivé. */
  isHistoryLoaded: boolean
  currentUserId: string
  activeUsers: ActiveUser[]
  receipts: ReadReceipt[]
  unreadCount: number
  /** `seq` du dernier message reçu d'un autre participant. */
  latestIncomingSeq: number
  /** Appelé quand les messages jusqu'à `seq` sont visibles à l'écran. */
  onRead: (seq: number) => void
  onRetry: (messageId: string) => void
  onReact: (message: ChatMessage, emoji: ReactionEmoji) => void
}

export function MessageList({
  messages,
  isHistoryLoaded,
  currentUserId,
  activeUsers,
  receipts,
  unreadCount,
  latestIncomingSeq,
  onRead,
  onRetry,
  onReact,
}: MessageListProps) {
  const sections = groupMessages(messages)
  const lastMessage = messages[messages.length - 1]
  // Les traces de direct n'ont pas d'accusé de lecture : on les écarte.
  const lastOwnMessageId = messages.findLast(
    (message) => message.author.id === currentUserId && !message.call
  )?.id
  const latestCallId = messages.findLast((message) => message.call)?.id

  // Les messages de l'historique s'affichent tels quels ; seuls ceux qui
  // arrivent ensuite entrent en scène (état dérivé pendant le rendu).
  const [historyIds, setHistoryIds] = useState<ReadonlySet<string> | null>(null)
  if (historyIds === null && isHistoryLoaded) {
    setHistoryIds(new Set(messages.map((message) => message.id)))
  }

  const { containerRef, isAtBottom, scrollToBottom, handleScroll } =
    useStickToBottom<HTMLDivElement>({
      trigger: `${lastMessage?.id}:${activeUsers.length}`,
      force: lastMessage?.author.id === currentUserId,
    })

  // Un message est lu quand il est réellement à l'écran : onglet affiché et
  // liste en bas (pas pendant la lecture de l'historique).
  const isPageVisible = usePageVisible()
  const isReading = isPageVisible && isAtBottom

  useEffect(() => {
    if (isReading && latestIncomingSeq > 0) onRead(latestIncomingSeq)
  }, [isReading, latestIncomingSeq, onRead])

  const rise = useTempoTransition(spring.entrance)
  const fade = useTempoTransition(transition.fade)
  const swap = useTempoTransition(transition.swap)

  return (
    <ReducedMotionConfig>
      <div className="relative min-h-0 flex-1">
        {/* Pas de barre de défilement : les bords s'estompent là où il reste des messages. */}
        <ScrollFade asChild size={40} shrink={0} blur={0}>
          <div
            ref={containerRef}
            onScroll={handleScroll}
            role="log"
            aria-label="Messages"
            aria-live="polite"
            className="h-full overflow-y-auto overscroll-contain px-3 pt-4 pb-16 sm:px-4 sm:pt-6"
          >
            {messages.length === 0 ? (
              isHistoryLoaded && <EmptyState />
            ) : (
              <div className="flex flex-col gap-6">
                {sections.map((section) => (
                  <section key={section.date} className="flex flex-col gap-4">
                    <DaySeparator date={section.date} />

                    <MessageGroup className="gap-4">
                      {section.runs.map((run) => {
                        const first = run.messages[0]

                        // Une trace de direct est toujours seule dans sa suite.
                        if (first.call) {
                          return (
                            <CallLogEntry
                              key={first.id}
                              call={first.call}
                              currentUserId={currentUserId}
                              animateIn={historyIds !== null && !historyIds.has(first.id)}
                              isLatest={first.id === latestCallId}
                            />
                          )
                        }

                        return (
                          <ChatMessageGroup
                            key={first.id}
                            run={run}
                            isOwn={run.author.id === currentUserId}
                            receipts={receipts}
                            historyIds={historyIds}
                            showReceiptLabel={
                              run.messages[run.messages.length - 1].id === lastOwnMessageId
                            }
                            currentUserId={currentUserId}
                            onRetry={onRetry}
                            onReact={onReact}
                          />
                        )
                      })}
                    </MessageGroup>
                  </section>
                ))}
              </div>
            )}

            <AnimatePresence initial={false}>
              {activeUsers.length > 0 && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { ...rise, opacity: fade } }}
                  exit={{ opacity: 0, transition: fade }}
                  className="mt-4"
                >
                  <TypingIndicator activeUsers={activeUsers} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollFade>

        {/* Apparaît et disparaît sur place (`scale.action` + `blur.icon`). */}
        <AnimatePresence>
          {!isAtBottom && (
            <motion.div
              key="jump"
              initial={{ opacity: 0, scale: scale.action, filter: blur.icon }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: swap }}
              exit={{ opacity: 0, scale: scale.action, filter: blur.icon, transition: swap }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2"
            >
              <AnimateIcon animateOnHover animateOnTap asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={
                    unreadCount > 0
                      ? `${unreadCount} message${unreadCount > 1 ? "s" : ""} non lu${unreadCount > 1 ? "s" : ""}, aller aux derniers messages`
                      : "Aller aux derniers messages"
                  }
                  onClick={() => scrollToBottom()}
                  className="relative size-10 bg-background shadow-md sm:size-8"
                >
                  <ArrowDown02 size={18} />
                  <UnreadBadge count={unreadCount} />
                </Button>
              </AnimateIcon>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ReducedMotionConfig>
  )
}

function DaySeparator({ date }: { date: string }) {
  return (
    <div className="sticky top-0 z-10 flex justify-center">
      <time
        dateTime={date}
        suppressHydrationWarning
        className="rounded-full border bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
      >
        {formatDayLabel(date)}
      </time>
    </div>
  )
}

/** Conversation vide : entrée en fondu, le micro invite à parler, et l'on rappelle que rien ne dure. */
function EmptyState() {
  return (
    <Effect
      fade
      blur={{ initialBlur: 2 }}
      slide={{ offset: 8 }}
      className="flex h-full flex-col items-center justify-center gap-3 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Mic size={26} animate="wiggle" animateOnHover="wiggle" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Rien pour l&apos;instant</p>
        <p className="text-sm text-balance text-muted-foreground">
          Maintenez l&apos;orbe en bas pour envoyer le premier vocal.
          <br />
          Les messages disparaissent une heure après leur envoi.
        </p>
      </div>
    </Effect>
  )
}
