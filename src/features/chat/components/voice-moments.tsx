"use client"

import { AnimatePresence, motion } from "motion/react"
import {
  ReducedMotionConfig,
  scale,
  spring,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { Popover, PopoverContent } from "@/components/ui/popover"
import type { ReactionEmoji } from "../lib/config"
import { formatNameList } from "../lib/format"
import { formatMoment } from "../lib/replies"
import type { Reaction } from "../types"
import { Emoji } from "./emoji"
import { ReactionBar } from "./message-reactions"
import { MomentChip } from "./reply-quote"

/**
 * Deux réactions plus proches que cette part de la durée se partagent un
 * repère : elles se chevaucheraient sur l'onde.
 */
const MARKER_SPACING = 1 / 16

interface MomentMenuProps {
  /** Le moment visé (ms) ; `null` : menu fermé. */
  atMs: number | null
  onClose: () => void
  /** Point de l'onde où le menu s'accroche. */
  anchor: React.RefObject<HTMLElement | null>
  /** Ma réaction, si elle est posée sur ce moment-là. */
  selected?: ReactionEmoji
  onReact: (emoji: ReactionEmoji) => void
}

/** Sur un passage du vocal : y réagir (« 🔥 à 0:42 »). */
export function MomentMenu({ atMs, onClose, anchor, selected, onReact }: MomentMenuProps) {
  return (
    <Popover open={atMs !== null} onOpenChange={(open) => !open && onClose()}>
      <PopoverContent
        anchor={anchor}
        side="top"
        sideOffset={10}
        aria-label={atMs === null ? undefined : `Réagir au passage ${formatMoment(atMs)}`}
        className="flex w-auto flex-col rounded-3xl p-1 shadow-lg"
      >
        {atMs !== null && (
          <>
            <p className="flex items-center justify-center gap-1.5 px-3 pt-1.5 pb-1 text-[11px] font-medium text-muted-foreground">
              Réagir à ce passage
              <MomentChip atMs={atMs} />
            </p>
            <ReactionBar selected={selected} onSelect={onReact} />
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

interface MomentMarker {
  key: string
  /** Position sur l'onde, de 0 à 1. */
  ratio: number
  atMs: number
  /** L'emoji le plus donné à cet endroit. */
  emoji: ReactionEmoji
  count: number
  label: string
  isMine: boolean
}

type MomentReaction = Reaction & { atMs: number }

/** Réactions posées sur des moments, regroupées quand elles se touchent. */
function toMarkers(reactions: Reaction[], durationMs: number, currentUserId: string): MomentMarker[] {
  const moments = reactions
    .filter((item): item is MomentReaction => item.atMs !== undefined)
    .sort((a, b) => a.atMs - b.atMs)

  const groups: MomentReaction[][] = []
  for (const reaction of moments) {
    const group = groups.at(-1)
    if (group && (reaction.atMs - group[0].atMs) / durationMs < MARKER_SPACING) group.push(reaction)
    else groups.push([reaction])
  }

  return groups.map((group) => {
    const counts = new Map<ReactionEmoji, number>()
    for (const { emoji } of group) counts.set(emoji, (counts.get(emoji) ?? 0) + 1)
    const [emoji] = [...counts].sort((a, b) => b[1] - a[1])[0]
    const atMs = group[0].atMs
    const names = group.map(
      ({ user, emoji: given }) => `${user.id === currentUserId ? "Vous" : user.name} ${given}`
    )
    return {
      key: `${atMs}:${group.length}`,
      ratio: Math.min(atMs / durationMs, 1),
      atMs,
      emoji,
      count: group.length,
      label: `${formatNameList(names)} ${formatMoment(atMs)}`,
      isMine: group.some(({ user }) => user.id === currentUserId),
    }
  })
}

interface MomentMarkersProps {
  reactions: Reaction[]
  durationMs: number
  currentUserId: string
  /** Écoute le vocal à partir de ce moment. */
  onPlayFrom: (atMs: number) => void
}

/**
 * Au-dessus de l'onde, les réactions posées sur ses moments (« 🔥 à 0:42 ») :
 * un appui écoute le vocal à partir de là.
 */
export function MomentMarkers({ reactions, durationMs, currentUserId, onPlayFrom }: MomentMarkersProps) {
  const pop = useTempoTransition(spring.pop)
  const popOut = useTempoTransition(transition.popOut)
  const resize = useTempoTransition(spring.height)
  const markers = durationMs > 0 ? toMarkers(reactions, durationMs, currentUserId) : []

  return (
    <ReducedMotionConfig>
      <AnimatePresence initial={false}>
        {markers.length > 0 && (
          <motion.ul
            key="markers"
            aria-label="Réactions aux passages du vocal"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: resize }}
            exit={{ height: 0, opacity: 0, transition: resize }}
            className="relative"
          >
            {/* Hauteur réservée : les repères sont placés en absolu, au-dessus de leur moment. */}
            <li aria-hidden className="h-5" />
            <AnimatePresence initial={false}>
              {markers.map((marker) => (
                <motion.li
                  key={marker.key}
                  initial={{ opacity: 0, scale: scale.icon, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0, transition: pop }}
                  exit={{ opacity: 0, scale: scale.icon, transition: popOut }}
                  className="absolute bottom-0 -translate-x-1/2"
                  style={{ left: `${marker.ratio * 100}%` }}
                >
                  <button
                    type="button"
                    onClick={() => onPlayFrom(marker.atMs)}
                    aria-label={`${marker.label}. Écouter ce passage`}
                    title={marker.label}
                    className="press relative flex h-5 items-center gap-px rounded-full px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-current/40 pointer-fine:hover:scale-110"
                  >
                    <Emoji emoji={marker.emoji} size={15} />
                    {marker.count > 1 && (
                      <span className="text-[10px] leading-none font-semibold tabular-nums">{marker.count}</span>
                    )}
                    {/* Ma réaction : un point sous l'emoji. */}
                    {marker.isMine && (
                      <span
                        aria-hidden
                        className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current"
                      />
                    )}
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </AnimatePresence>
    </ReducedMotionConfig>
  )
}
