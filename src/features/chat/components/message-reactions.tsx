"use client"

import { useRef, useState } from "react"
import { SmilePlusIcon } from "@hugeicons/core-free-icons"
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
import { formatMoment } from "../lib/replies"
import type { ChatMessage } from "../types"
import { Emoji } from "./emoji"
import type { MessageActions, MessageRemoval } from "./message-actions"
import { MessageMenu } from "./message-menu"

interface ReactableMessageProps {
  message: ChatMessage
  isOwn: boolean
  currentUserId: string
  onReact: (message: ChatMessage, emoji: ReactionEmoji) => void
  /** Modifier, supprimer, retirer une pièce jointe : ce qui est permis sur ce message. */
  actions: MessageActions | null
  /** Ouvre l'édition du texte, sur place. */
  onEditRequest: () => void
  /** Action toujours visible à côté de la bulle, au plus près d'elle (répondre). */
  sideAction?: React.ReactNode
  children: React.ReactNode
}

const REMOVAL_CONFIRMATIONS: Record<MessageRemoval, { description: string; confirmLabel: string }> = {
  unsend: {
    description: "Personne ne l'a encore vu : il disparaîtra sans laisser de trace.",
    confirmLabel: "Supprimer",
  },
  moderate: {
    description: "Il disparaîtra pour tous les membres du groupe ; seule restera la mention « Message supprimé ».",
    confirmLabel: "Supprimer pour tous",
  },
}

/**
 * Rend un message réactif : au survol (souris), un bouton ouvre le menu ; au
 * doigt, un appui long. On y réagit, et selon ses droits on y modifie,
 * supprime ou allège le message. Les réactions s'affichent sous le message.
 */
export function ReactableMessage({
  message,
  isOwn,
  currentUserId,
  onReact,
  actions,
  onEditRequest,
  sideAction,
  children,
}: ReactableMessageProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const longPress = useLongPress(() => setIsOpen(true))
  const myReaction = message.reactions.find((item) => item.user.id === currentUserId)?.emoji

  function react(emoji: ReactionEmoji) {
    onReact(message, emoji)
    setIsOpen(false)
  }

  /** Lance l'action ; son échec (ex. message vu entre-temps) s'affiche sous le message. */
  function perform(request: () => Promise<string | null>) {
    setActionError(null)
    void request().then(setActionError)
  }

  const confirmation = actions?.removal ? REMOVAL_CONFIRMATIONS[actions.removal] : null

  return (
    <div className="flex w-full flex-col items-start group-data-[align=end]/message:items-end">
      {/* Ajusté au contenu : le bouton du menu se colle au bord de la bulle.
          Pas de loupe ni de menu « copier l'image » d'iOS pendant l'appui long. */}
      <div
        ref={anchorRef}
        {...longPress}
        className="group/reactable relative flex max-w-full flex-col items-start gap-1 [-webkit-touch-callout:none] group-data-[align=end]/message:items-end"
      >
        {children}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          {/* À côté de la bulle (hors d'elle : la carte garde son dessin intact) :
              l'action propre au message (répondre), toujours là, puis, au survol
              de la souris, le bouton des réactions. Au doigt, l'appui long ouvre ce menu. */}
          <div
            className={cn(
              "absolute top-1/2 flex -translate-y-1/2 items-center gap-0.5",
              isOwn ? "right-full mr-1 flex-row-reverse" : "left-full ml-1"
            )}
          >
            {sideAction}
            <PopoverTrigger
              aria-label={actions?.removal ? "Réagir ou agir sur le message" : "Réagir au message"}
              className={cn(
                "hidden size-8 place-items-center rounded-full text-muted-foreground outline-none pointer-fine:grid",
                "opacity-0 transition-opacity group-hover/reactable:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:opacity-100"
              )}
            >
              <HugeiconsIcon icon={SmilePlusIcon} size={18} strokeWidth={1.8} />
            </PopoverTrigger>
          </div>
          <PopoverContent
            anchor={anchorRef}
            side="top"
            align={isOwn ? "end" : "start"}
            className="flex w-auto flex-col rounded-3xl p-1 shadow-lg"
          >
            <ReactionBar selected={myReaction} onSelect={react} />
            {actions && (
              <MessageMenu
                actions={actions}
                onEdit={() => {
                  setIsOpen(false)
                  onEditRequest()
                }}
                onRemove={() => {
                  setIsOpen(false)
                  setIsConfirmOpen(true)
                }}
                onRemoveAttachment={(attachment) => {
                  setIsOpen(false)
                  perform(() => actions.removeAttachment(attachment))
                }}
              />
            )}
          </PopoverContent>
        </Popover>
      </div>

      {actions && confirmation && (
        <ConfirmDialog
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          title="Supprimer ce message ?"
          description={confirmation.description}
          confirmLabel={confirmation.confirmLabel}
          onConfirm={() => perform(actions.remove)}
        />
      )}
      {actionError && (
        <p role="alert" className="max-w-[85cqw] px-1 text-xs text-destructive">
          {actionError}
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
  /** « Léa », ou « Léa à 0:42 » pour une réaction posée sur un moment du vocal. */
  names: string[]
  isMine: boolean
}

/** Réactions regroupées par emoji (sur tout le message ou sur un moment), les plus nombreuses d'abord. */
function groupReactions(message: ChatMessage, currentUserId: string): ReactionGroup[] {
  return REACTION_EMOJIS.map((emoji) => {
    const reactions = message.reactions.filter((item) => item.emoji === emoji)
    return {
      emoji,
      names: reactions.map(({ user, atMs }) =>
        atMs === undefined ? user.name : `${user.name} ${formatMoment(atMs)}`
      ),
      isMine: reactions.some((item) => item.user.id === currentUserId),
    }
  })
    .filter((group) => group.names.length > 0)
    .sort((a, b) => b.names.length - a.names.length)
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
          {groups.map(({ emoji, names: reactors, isMine }) => {
            const count = reactors.length
            const names = formatNameList(reactors)
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
                  aria-label={`${emoji} ${count} : ${names}${isMine ? " (vous)" : ""}`}
                  title={names}
                  onClick={() => onToggle(emoji)}
                  className={cn(
                    "press flex h-6 items-center gap-1 rounded-full border bg-background px-1.5 text-xs font-semibold shadow-xs ring-2 ring-background outline-none focus-visible:ring-ring/50",
                    // Fond opaque (la pastille chevauche la bulle) : seule la bordure se teinte.
                    isMine && "border-voice/60 text-voice"
                  )}
                >
                  <Emoji emoji={emoji} size={15} />
                  {count > 1 && (
                    <span className="tabular-nums">
                      <SlidingNumber number={count} />
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
