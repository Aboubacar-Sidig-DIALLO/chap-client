"use client"

import { motion } from "motion/react"
import { AnimateIcon } from "@animate-ui/react/icons"
import {
  spring,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { Refresh } from "@/components/animate-ui/icons/hugeicons/refresh"
import { Button } from "@/components/ui/button"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message"
import { cn } from "@/lib/utils"
import type { ReactionEmoji } from "../lib/config"
import { getJumboEmojis } from "../lib/emoji"
import { formatTime } from "../lib/format"
import type { MessageRun } from "../lib/group-messages"
import { getMessageReceipt } from "../lib/receipts"
import type { ChatMessage, ReadReceipt } from "../types"
import { Emoji } from "./emoji"
import { MessageAttachments } from "./message-attachments"
import { MessageBubble } from "./message-bubble"
import { ReactableMessage } from "./message-reactions"
import { MessageReceiptStatus } from "./message-receipt-status"
import { UserAvatar } from "./user-avatar"

interface ChatMessageGroupProps {
  run: MessageRun
  isOwn: boolean
  receipts: ReadReceipt[]
  /** Messages déjà là au chargement (affichés sans animation) ; `null` : historique pas encore reçu. */
  historyIds: ReadonlySet<string> | null
  /** Affiche le statut en toutes lettres (groupe contenant le dernier message envoyé). */
  showReceiptLabel?: boolean
  currentUserId: string
  onRetry: (messageId: string) => void
  onReact: (message: ChatMessage, emoji: ReactionEmoji) => void
}

/** Messages consécutifs d'un même auteur : un seul avatar et un seul horodatage. */
export function ChatMessageGroup({
  run,
  isOwn,
  receipts,
  historyIds,
  showReceiptLabel = false,
  currentUserId,
  onRetry,
  onReact,
}: ChatMessageGroupProps) {
  const lastMessage = run.messages[run.messages.length - 1]

  return (
    <Message align={isOwn ? "end" : "start"}>
      {!isOwn && (
        // Aligne l'avatar sur la dernière bulle (au-dessus du footer).
        <MessageAvatar className="group-has-data-[slot=message-footer]/message:-translate-y-5">
          <UserAvatar user={run.author} />
        </MessageAvatar>
      )}

      <MessageContent className="gap-1">
        {!isOwn && <MessageHeader>{run.author.name}</MessageHeader>}

        {run.messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwn={isOwn}
            currentUserId={currentUserId}
            animateIn={historyIds !== null && !historyIds.has(message.id)}
            onRetry={onRetry}
            onReact={onReact}
          />
        ))}

        <MessageFooter className="gap-1.5">
          <time dateTime={lastMessage.createdAt} suppressHydrationWarning>
            {formatTime(lastMessage.createdAt)}
          </time>
          {/* Statut du dernier message : les curseurs étant ordonnés, les précédents en sont au moins là. */}
          {isOwn && lastMessage.status !== "failed" && (
            <MessageReceiptStatus
              receipt={getMessageReceipt(lastMessage, receipts)}
              showLabel={showReceiptLabel}
            />
          )}
        </MessageFooter>
      </MessageContent>
    </Message>
  )
}

interface MessageItemProps {
  message: ChatMessage
  isOwn: boolean
  currentUserId: string
  /** Message arrivé en direct : il entre en scène (fondu, légère montée). */
  animateIn: boolean
  onRetry: (messageId: string) => void
  onReact: (message: ChatMessage, emoji: ReactionEmoji) => void
}

interface JumboEmojisProps {
  emojis: string[]
  /** Le texte du message, lu par les lecteurs d'écran. */
  label: string
  isPending: boolean
}

/** Un message de un à trois emojis s'affiche en grand, animé, sans bulle. */
function JumboEmojis({ emojis, label, isPending }: JumboEmojisProps) {
  return (
    <p
      aria-label={label}
      className={cn("flex gap-1 py-1 transition-opacity", isPending && "opacity-60")}
    >
      {emojis.map((emoji, index) => (
        <Emoji key={index} emoji={emoji} size={48} animated />
      ))}
    </p>
  )
}

function MessageItem({
  message,
  isOwn,
  currentUserId,
  animateIn,
  onRetry,
  onReact,
}: MessageItemProps) {
  const rise = useTempoTransition(spring.entrance)
  const fade = useTempoTransition(transition.fade)
  const jumboEmojis = message.content ? getJumboEmojis(message.content) : null

  const body = (
    <>
      {message.attachments.length > 0 && (
        <MessageAttachments message={message} isOwn={isOwn} />
      )}

      {jumboEmojis ? (
        <JumboEmojis emojis={jumboEmojis} label={message.content} isPending={message.status !== "sent"} />
      ) : (
        message.content && (
          <MessageBubble isOwn={isOwn} status={message.status}>
            {message.content}
          </MessageBubble>
        )
      )}
    </>
  )

  return (
    <motion.div
      initial={animateIn ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0, transition: { ...rise, opacity: fade } }}
      // `@container` : la colonne de référence des largeurs max. des bulles et cartes (`cqw`),
      // quelles que soient les enveloppes intermédiaires (réactions).
      className="@container flex w-full flex-col items-start gap-1 group-data-[align=end]/message:items-end"
    >
      {/* On ne réagit qu'à un message reçu par le serveur. */}
      {message.status === "sent" ? (
        <ReactableMessage
          message={message}
          isOwn={isOwn}
          currentUserId={currentUserId}
          onReact={onReact}
        >
          {body}
        </ReactableMessage>
      ) : (
        body
      )}

      {message.status === "failed" && (
        <AnimateIcon animateOnHover="rotate" animateOnTap="rotate" asChild>
          <Button
            variant="ghost"
            size="xs"
            className="text-destructive hover:text-destructive"
            onClick={() => onRetry(message.id)}
          >
            <Refresh size={12} />
            Échec de l&apos;envoi · Réessayer
          </Button>
        </AnimateIcon>
      )}
    </motion.div>
  )
}
