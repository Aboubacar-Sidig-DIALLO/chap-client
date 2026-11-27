"use client"

import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
import type { ChatMessage, ChatUser, ReadReceipt } from "../types"
import { Emoji } from "./emoji"
import { MessageAttachments } from "./message-attachments"
import { MessageBubble } from "./message-bubble"
import { ReactableMessage } from "./message-reactions"
import { MessageReceiptStatus } from "./message-receipt-status"
import { UserAvatar } from "./user-avatar"

interface ChatMessageGroupProps {
  run: MessageRun
  isOwn: boolean
  /** Nom et avatar des messages reçus (groupe) ; inutiles à deux. */
  showAuthor: boolean
  receipts: ReadReceipt[]
  /** Messages déjà là au chargement (affichés sans animation) ; `null` : historique pas encore reçu. */
  historyIds: ReadonlySet<string> | null
  /** Affiche le statut en toutes lettres (groupe contenant le dernier message envoyé). */
  showReceiptLabel?: boolean
  currentUserId: string
  onRetry: (messageId: string) => void
  onReact: (message: ChatMessage, emoji: ReactionEmoji) => void
  /** Modérateur du groupe : supprime un message pour tous (renvoie l'erreur éventuelle). */
  onDelete?: (message: ChatMessage) => Promise<string | null>
}

/** Messages consécutifs d'un même auteur : un seul avatar (en groupe) et un seul horodatage. */
export function ChatMessageGroup({
  run,
  isOwn,
  showAuthor,
  receipts,
  historyIds,
  showReceiptLabel = false,
  currentUserId,
  onRetry,
  onReact,
  onDelete,
}: ChatMessageGroupProps) {
  const lastMessage = run.messages[run.messages.length - 1]

  return (
    <Message align={isOwn ? "end" : "start"}>
      {!isOwn && showAuthor && (
        // Aligne l'avatar sur la dernière bulle (au-dessus du footer).
        <MessageAvatar className="group-has-data-[slot=message-footer]/message:-translate-y-5">
          <UserAvatar user={run.author} />
        </MessageAvatar>
      )}

      <MessageContent className="gap-1">
        {!isOwn && showAuthor && <MessageHeader>{run.author.name}</MessageHeader>}

        {run.messages.map((message, index) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwn={isOwn}
            isFollowUp={index > 0}
            currentUserId={currentUserId}
            animateIn={historyIds !== null && !historyIds.has(message.id)}
            onRetry={onRetry}
            onReact={onReact}
            onDelete={onDelete}
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
  /** Pas le premier de sa suite : sa bulle se soude à la précédente. */
  isFollowUp: boolean
  currentUserId: string
  /** Message arrivé en direct : il entre en scène (fondu, légère montée). */
  animateIn: boolean
  onRetry: (messageId: string) => void
  onReact: (message: ChatMessage, emoji: ReactionEmoji) => void
  onDelete?: (message: ChatMessage) => Promise<string | null>
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

interface DeletedMessageProps {
  deletedBy: ChatUser
  isOwn: boolean
  currentUserId: string
}

/** Message supprimé par un modérateur : à sa place, qui l'a supprimé. */
function DeletedMessage({ deletedBy, isOwn, currentUserId }: DeletedMessageProps) {
  return (
    <MessageBubble
      isOwn={isOwn}
      className="flex items-center gap-1.5 border border-dashed bg-transparent! text-muted-foreground! italic"
    >
      <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} aria-hidden className="shrink-0" />
      {deletedBy.id === currentUserId ? "Vous avez supprimé ce message" : `Message supprimé par ${deletedBy.name}`}
    </MessageBubble>
  )
}

function MessageItem({
  message,
  isOwn,
  isFollowUp,
  currentUserId,
  animateIn,
  onRetry,
  onReact,
  onDelete,
}: MessageItemProps) {
  const rise = useTempoTransition(spring.entrance)
  const fade = useTempoTransition(transition.fade)
  const jumboEmojis = message.content ? getJumboEmojis(message.content) : null

  const body = message.deletedBy ? (
    <DeletedMessage deletedBy={message.deletedBy} isOwn={isOwn} currentUserId={currentUserId} />
  ) : (
    <>
      {message.attachments.length > 0 && (
        <MessageAttachments message={message} isOwn={isOwn} />
      )}

      {jumboEmojis ? (
        <JumboEmojis emojis={jumboEmojis} label={message.content} isPending={message.status !== "sent"} />
      ) : (
        message.content && (
          <MessageBubble isOwn={isOwn} status={message.status} isFollowUp={isFollowUp}>
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
      // Seul le dernier de la suite affiche son heure : au survol, chacun donne la sienne.
      title={formatTime(message.createdAt)}
      // `@container` : la colonne de référence des largeurs max. des bulles et cartes (`cqw`),
      // quelles que soient les enveloppes intermédiaires (réactions).
      className="@container flex w-full flex-col items-start gap-1 group-data-[align=end]/message:items-end"
    >
      {/* On ne réagit qu'à un message reçu par le serveur, et jamais à un message supprimé. */}
      {message.status === "sent" && !message.deletedBy ? (
        <ReactableMessage
          message={message}
          isOwn={isOwn}
          currentUserId={currentUserId}
          onReact={onReact}
          onDelete={onDelete}
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
