"use client"

import { useRef, useState } from "react"
import { Delete02Icon, SmilePlusIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { SlidingNumber } from "@animate-ui/react/primitives/texts/sliding-number"
import {
  ReducedMotionConfig,
  scale,
  spring,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useLongPress } from "../hooks/use-long-press"
import { REACTION_EMOJIS, type ReactionEmoji } from "../lib/config"
import { formatNameList } from "../lib/format"
import type { ChatMessage, ChatUser } from "../types"
import { Emoji } from "./emoji"

interface ReactableMessageProps {
  message: ChatMessage
  isOwn: boolean
  currentUserId: string
  onReact: (message: ChatMessage, emoji: ReactionEmoji) => void
  /**
   * Modérateur du groupe : supprime le message pour tous, après confirmation.
   * Renvoie l'erreur à afficher, ou `null`.
   */
  onDelete?: (message: ChatMessage) => Promise<string | null>
  children: React.ReactNode
}

/**
 * Rend un message réactif : au survol (souris), un bouton ouvre la barre de
 * réactions ; au doigt, un appui long. Les réactions s'affichent sous le message.
 * Un modérateur y trouve aussi de quoi le supprimer.
 */
export function ReactableMessage({
  message,
  isOwn,
  currentUserId,
  onReact,
  onDelete,
  children,
}: ReactableMessageProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const longPress = useLongPress(() => setIsOpen(true))
  const myReaction = message.reactions.find((item) => item.user.id === currentUserId)?.emoji

  function react(emoji: ReactionEmoji) {
    onReact(message, emoji)
    setIsOpen(false)
  }

  return (
    <div className="flex w-full flex-col items-start group-data-[align=end]/message:items-end">
      {/* Ajusté au contenu : le bouton de réaction se colle au bord de la bulle.
          Pas de loupe ni de menu « copier l'image » d'iOS pendant l'appui long. */}
      <div
        ref={anchorRef}
        {...longPress}
        className="group/reactable relative flex max-w-full flex-col items-start gap-1 [-webkit-touch-callout:none] group-data-[align=end]/message:items-end"
      >
        {children}
        <ReactionPicker
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          anchorRef={anchorRef}
          isOwn={isOwn}
          selected={myReaction}
          onSelect={react}
          onDeleteRequest={
            onDelete &&
            (() => {
              setIsOpen(false)
              setIsConfirmOpen(true)
            })
          }
        />
      </div>

      {onDelete && (
        <ConfirmDialog
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          title="Supprimer ce message ?"
          description="Il disparaîtra pour tous les membres du groupe ; seule restera la mention « Message supprimé »."
          confirmLabel="Supprimer pour tous"
          onConfirm={() => {
            setDeleteError(null)
            void onDelete(message).then(setDeleteError)
          }}
        />
      )}
      {deleteError && (
        <p role="alert" className="px-1 text-xs text-destructive">
          {deleteError}
        </p>
      )}

      <ReactionChips
        message={message}
        currentUserId={currentUserId}
        onToggle={(emoji) => onReact(message, emoji)}
      />
    </div>
  )
}

interface ReactionPickerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  anchorRef: React.RefObject<HTMLDivElement | null>
  isOwn: boolean
  selected?: ReactionEmoji
  onSelect: (emoji: ReactionEmoji) => void
  /** Modérateur : propose la suppression, à côté des réactions. */
  onDeleteRequest?: () => void
}

/** Bouton (au survol, à la souris) et barre de réactions, posée au-dessus du message. */
function ReactionPicker({
  isOpen,
  onOpenChange,
  anchorRef,
  isOwn,
  selected,
  onSelect,
  onDeleteRequest,
}: ReactionPickerProps) {
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger
        aria-label={onDeleteRequest ? "Réagir au message ou le supprimer" : "Réagir au message"}
        className={cn(
          // Hors de la bulle, à côté d'elle : la carte garde son dessin intact.
          "absolute top-1/2 hidden size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground outline-none pointer-fine:grid",
          "opacity-0 transition-opacity group-hover/reactable:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:opacity-100",
          isOwn ? "right-full mr-1" : "left-full ml-1"
        )}
      >
        <HugeiconsIcon icon={SmilePlusIcon} size={18} strokeWidth={1.8} />
      </PopoverTrigger>
      <PopoverContent
        anchor={anchorRef}
        side="top"
        align={isOwn ? "end" : "start"}
        className="w-auto rounded-full p-1 shadow-lg"
      >
        <div className="flex items-center">
          <ReactionBar selected={selected} onSelect={onSelect} />
          {onDeleteRequest && (
            <>
              <span aria-hidden className="mx-1 h-6 w-px bg-border" />
              <button
                type="button"
                aria-label="Supprimer le message pour tous"
                title="Supprimer pour tous"
                onClick={onDeleteRequest}
                className="grid size-10 place-items-center rounded-full text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <HugeiconsIcon icon={Delete02Icon} size={20} strokeWidth={1.8} />
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface ReactionBarProps {
  selected?: ReactionEmoji
  onSelect: (emoji: ReactionEmoji) => void
}

/**
 * Les emojis entrent en cascade ; celui qu'on survole s'anime et grandit.
 * Partagée avec le direct (réactions qui s'envolent).
 */
export function ReactionBar({ selected, onSelect }: ReactionBarProps) {
  const pop = useTempoTransition(spring.pop)
  const [active, setActive] = useState<ReactionEmoji | null>(null)

  return (
    <ReducedMotionConfig>
      <div role="group" aria-label="Réactions" className="flex items-center gap-0.5">
        {REACTION_EMOJIS.map((emoji, index) => (
          <motion.button
            key={emoji}
            type="button"
            aria-label={`Réagir avec ${emoji}`}
            aria-pressed={selected === emoji}
            initial={{ opacity: 0, scale: scale.icon, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { ...pop, delay: index * 0.03 } }}
            onPointerEnter={() => setActive(emoji)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(emoji)}
            onBlur={() => setActive(null)}
            onClick={() => onSelect(emoji)}
            className={cn(
              "grid size-10 place-items-center rounded-full outline-none transition-[background-color,scale] duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 pointer-fine:hover:scale-125",
              selected === emoji && "bg-accent"
            )}
          >
            <Emoji emoji={emoji} size={28} animated={active === emoji || selected === emoji} />
          </motion.button>
        ))}
      </div>
    </ReducedMotionConfig>
  )
}

interface ReactionGroup {
  emoji: ReactionEmoji
  users: ChatUser[]
  isMine: boolean
}

/** Réactions regroupées par emoji, les plus nombreuses d'abord. */
function groupReactions(message: ChatMessage, currentUserId: string): ReactionGroup[] {
  return REACTION_EMOJIS.map((emoji) => {
    const users = message.reactions
      .filter((item) => item.emoji === emoji)
      .map((item) => item.user)
    return { emoji, users, isMine: users.some((user) => user.id === currentUserId) }
  })
    .filter((group) => group.users.length > 0)
    .sort((a, b) => b.users.length - a.users.length)
}

interface ReactionChipsProps {
  message: ChatMessage
  currentUserId: string
  onToggle: (emoji: ReactionEmoji) => void
}

/** Pastilles sous la bulle : un appui ajoute (ou retire) sa propre réaction. */
function ReactionChips({ message, currentUserId, onToggle }: ReactionChipsProps) {
  const pop = useTempoTransition(spring.pop)
  const popOut = useTempoTransition(transition.popOut)
  const move = useTempoTransition(spring.reflow)
  const groups = groupReactions(message, currentUserId)

  return (
    <ReducedMotionConfig>
      <ul
        aria-label="Réactions au message"
        // Les pastilles chevauchent le bas de la bulle.
        className={cn("relative z-10 flex flex-wrap gap-1 px-2", groups.length > 0 && "-mt-2")}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {groups.map(({ emoji, users, isMine }) => {
            const names = formatNameList(users.map((user) => user.name))
            return (
              <motion.li
                key={emoji}
                layout="position"
                initial={{ opacity: 0, scale: scale.icon }}
                animate={{ opacity: 1, scale: 1, transition: pop }}
                exit={{ opacity: 0, scale: scale.icon, transition: popOut }}
                transition={move}
              >
                <button
                  type="button"
                  aria-pressed={isMine}
                  aria-label={`${emoji} ${users.length} : ${names}${isMine ? " (vous)" : ""}`}
                  title={names}
                  onClick={() => onToggle(emoji)}
                  className={cn(
                    "press flex h-6 items-center gap-1 rounded-full border bg-background px-1.5 text-xs font-semibold shadow-xs ring-2 ring-background outline-none focus-visible:ring-ring/50",
                    // Fond opaque (la pastille chevauche la bulle) : seule la bordure se teinte.
                    isMine && "border-voice/60 text-voice"
                  )}
                >
                  <Emoji emoji={emoji} size={15} />
                  {users.length > 1 && (
                    <span className="tabular-nums">
                      <SlidingNumber number={users.length} />
                    </span>
                  )}
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </ReducedMotionConfig>
  )
}
