"use client"

import {
  ArrowTurnBackwardIcon,
  Cancel01Icon,
  Delete02Icon,
  File01Icon,
  Image01Icon,
  Mic01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { AnimateIcon } from "@animate-ui/react/icons"
import { Cancel01 } from "@/components/animate-ui/icons/hugeicons/cancel-01"
import { cn } from "@/lib/utils"
import { getAttachmentUrl } from "../lib/attachments"
import { formatDuration } from "../lib/format"
import { describeQuote, formatMoment, type QuoteKind, type QuotePreview } from "../lib/replies"
import type { ChatMessage, ReplyRef, VoiceMetadata } from "../types"
import { useReply, type ReplyDraft } from "./reply-provider"
import { ViewOnceIcon } from "./view-once-icon"
import { Waveform } from "./waveform"

const KIND_ICONS: Partial<Record<QuoteKind, IconSvgElement>> = {
  voice: Mic01Icon,
  photo: Image01Icon,
  file: File01Icon,
  gone: Delete02Icon,
}

/** Barres de la mini forme d'onde d'une citation. */
const MINI_WAVEFORM_BARS = 20

/** Réduit une forme d'onde à `count` barres (la plus haute de chaque tranche). */
function downsample(levels: number[], count: number) {
  if (levels.length <= count) return levels
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor((index * levels.length) / count)
    const end = Math.floor(((index + 1) * levels.length) / count)
    return Math.max(...levels.slice(start, Math.max(end, start + 1)))
  })
}

function authorLabel(message: ChatMessage | undefined, currentUserId: string) {
  if (!message) return "Message"
  return message.author.id === currentUserId ? "Vous" : message.author.name
}

interface ReplyQuoteProps {
  reply: ReplyRef
  isOwn: boolean
}

/**
 * Au-dessus d'une réponse : le message cité (et le moment du vocal cité).
 * Un appui y ramène et, pour un moment, l'écoute à partir de là.
 */
export function ReplyQuote({ reply, isOwn }: ReplyQuoteProps) {
  const { currentUserId, findMessage, jumpTo } = useReply()
  const target = findMessage(reply.messageId)
  const preview = describeQuote(target)
  const author = authorLabel(target, currentUserId)
  // Un moment n'a de sens que tant que le vocal est là.
  const atMs = preview.voice ? reply.atMs : undefined
  const isReachable = preview.kind !== "gone"

  const label = [
    `Réponse à ${author}`,
    atMs !== undefined && `, vocal ${formatMoment(atMs)}`,
    ` : ${preview.text}`,
    isReachable && (atMs !== undefined ? ". Écouter ce passage" : ". Voir le message"),
  ]
    .filter(Boolean)
    .join("")

  return (
    <button
      type="button"
      disabled={!isReachable}
      onClick={() => jumpTo(reply)}
      aria-label={label}
      className={cn(
        "press flex w-fit max-w-[85cqw] min-w-0 items-stretch gap-2 rounded-2xl border bg-muted/50 py-1.5 pr-3 pl-1.5 text-left text-xs outline-none [--press-scale:0.985] sm:max-w-[75cqw]",
        "focus-visible:ring-2 focus-visible:ring-ring/50 enabled:hover:bg-muted disabled:opacity-70",
        isOwn ? "rounded-br-md" : "rounded-bl-md"
      )}
    >
      <QuoteContent author={author} preview={preview} atMs={atMs} />
    </button>
  )
}

interface ReplyDraftBarProps {
  draft: ReplyDraft
  onCancel: () => void
  className?: string
}

/**
 * Au-dessus de la saisie : la réponse en préparation, qu'on peut abandonner.
 * Sur un passage d'un vocal, sa pastille (« 0:42 ✕ ») l'élargit au vocal entier.
 */
export function ReplyDraftBar({ draft, onCancel, className }: ReplyDraftBarProps) {
  const { currentUserId, startReply } = useReply()
  const preview = describeQuote(draft.message)
  const author = authorLabel(draft.message, currentUserId)

  return (
    <div
      role="status"
      aria-label={`Réponse à ${author}${draft.atMs !== undefined ? `, vocal ${formatMoment(draft.atMs)}` : ""} : ${preview.text}`}
      className={cn(
        "flex items-center gap-2 rounded-2xl border bg-background/95 py-1.5 pr-1 pl-1.5 text-xs shadow-xs backdrop-blur",
        className
      )}
    >
      <HugeiconsIcon
        icon={ArrowTurnBackwardIcon}
        size={16}
        strokeWidth={2}
        aria-hidden
        className="ml-1 shrink-0 text-voice"
      />
      <div className="flex min-w-0 flex-1 items-stretch gap-2">
        <QuoteContent
          author={`Répondre à ${author}`}
          preview={preview}
          atMs={draft.atMs}
          onClearMoment={() => startReply(draft.message)}
        />
      </div>
      <AnimateIcon animateOnHover animateOnTap asChild>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Annuler la réponse"
          className="press grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Cancel01 size={16} />
        </button>
      </AnimateIcon>
    </div>
  )
}

interface QuoteContentProps {
  author: string
  preview: QuotePreview
  atMs?: number
  /** Brouillon : retire le passage, la réponse vaut pour le vocal entier. */
  onClearMoment?: () => void
}

/** Le dessin commun d'une citation : liseré, auteur, moment, aperçu. */
function QuoteContent({ author, preview, atMs, onClearMoment }: QuoteContentProps) {
  const icon = KIND_ICONS[preview.kind]
  const isMoment = atMs !== undefined && preview.voice !== undefined

  return (
    <>
      <span aria-hidden className="w-[3px] shrink-0 rounded-full bg-voice" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-semibold text-voice">{author}</span>
          {isMoment &&
            (onClearMoment ? (
              <button
                type="button"
                onClick={onClearMoment}
                aria-label={`Répondre au vocal entier, pas seulement ${formatMoment(atMs)}`}
                title="Répondre au vocal entier"
                className="press group/moment flex shrink-0 items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <MomentChip atMs={atMs} className="pr-1 group-hover/moment:bg-voice/20">
                  <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2.4} aria-hidden />
                </MomentChip>
              </button>
            ) : (
              <MomentChip atMs={atMs} />
            ))}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          {isMoment && preview.voice ? (
            <MomentWaveform voice={preview.voice} atMs={atMs} />
          ) : preview.kind === "view-once" ? (
            <ViewOnceIcon size={13} />
          ) : (
            icon && <HugeiconsIcon icon={icon} size={13} strokeWidth={2} aria-hidden className="shrink-0" />
          )}
          <span className={cn("truncate", preview.kind === "gone" && "italic")}>{preview.text}</span>
        </span>
      </span>
      {preview.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element -- miniature d'une pièce jointe servie par l'API
        <img
          src={getAttachmentUrl(preview.thumbnail)}
          alt=""
          className="size-9 shrink-0 self-center rounded-lg object-cover"
          style={{ backgroundColor: preview.thumbnail.image?.color }}
        />
      )}
    </>
  )
}

interface MomentChipProps {
  atMs: number
  className?: string
  /** Après la durée (ex. la croix qui retire le passage). */
  children?: React.ReactNode
}

/** « 🎙 0:42 » : le passage cité. */
export function MomentChip({ atMs, className, children }: MomentChipProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-voice/12 px-1.5 py-px text-[11px] font-semibold text-voice tabular-nums transition-colors",
        className
      )}
    >
      <HugeiconsIcon icon={Mic01Icon} size={11} strokeWidth={2.2} aria-hidden />
      {formatDuration(atMs)}
      {children}
    </span>
  )
}

/** Mini forme d'onde : ce qui précède le moment cité est plein, un repère le marque. */
function MomentWaveform({ voice, atMs }: { voice: VoiceMetadata; atMs: number }) {
  const levels = downsample(voice.waveform, MINI_WAVEFORM_BARS)
  const ratio = voice.durationMs > 0 ? Math.min(atMs / voice.durationMs, 1) : 0

  return (
    <span aria-hidden className="relative block w-16 shrink-0 text-voice">
      <Waveform levels={levels} className="h-4 gap-px opacity-30" />
      <Waveform
        levels={levels}
        className="absolute inset-0 h-4 gap-px"
        style={{ clipPath: `inset(0 ${(1 - ratio) * 100}% 0 0)` }}
      />
      <span
        className="absolute -top-0.5 -bottom-0.5 w-0.5 -translate-x-1/2 rounded-full bg-voice ring-1 ring-background"
        style={{ left: `${ratio * 100}%` }}
      />
    </span>
  )
}
