"use client"

import { useEffect, useId, useRef, useState } from "react"
import { SmilePlusIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { AnimateIcon } from "@animate-ui/react/icons"
import {
  blur,
  ReducedMotionConfig,
  scale,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { Pause } from "@/components/animate-ui/icons/hugeicons/pause"
import { Play } from "@/components/animate-ui/icons/hugeicons/play"
import { cn } from "@/lib/utils"
import { useAudioPlayer } from "../hooks/use-audio-player"
import { useHoldStill } from "../hooks/use-hold-still"
import { getAttachmentUrl } from "../lib/attachments"
import { WAVEFORM_BARS } from "../lib/config"
import { formatDuration } from "../lib/format"
import { formatMoment, voiceOf } from "../lib/replies"
import type { Attachment, ChatMessage } from "../types"
import { getListenState, LISTEN_TONE, ListenStatus } from "./listen-status"
import { useReactions } from "./message-actions"
import { PlaybackRateButton } from "./playback-rate-button"
import { MomentMarkers, MomentMenu } from "./voice-moments"
import { useVoicePlayback } from "./voice-playback"
import { Waveform } from "./waveform"

/** Pas des flèches du clavier sur la forme d'onde. */
const KEYBOARD_STEP_MS = 5000

/** Onde de remplacement pour un fichier audio sans forme d'onde enregistrée. */
const PLACEHOLDER_WAVEFORM = Array.from({ length: WAVEFORM_BARS }, (_, index) =>
  Math.round(40 + 30 * Math.sin(index * 0.9) * Math.cos(index * 0.35))
)

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

interface VoiceMessageProps {
  attachment: Attachment
  message: ChatMessage
  isOwn: boolean
}

/**
 * Lecteur d'un message vocal (ou d'un fichier audio) : lecture/pause, onde qui
 * se colore au fil de la lecture, déplacement au clic ou au clavier, vitesse
 * commune à la conversation, et accusé « écouté ».
 */
export function VoiceMessage({ attachment, message, isOwn }: VoiceMessageProps) {
  const playback = useVoicePlayback()
  const reactions = useReactions()
  const containerRef = useRef<HTMLDivElement>(null)
  const momentAnchorRef = useRef<HTMLSpanElement>(null)
  const momentHintId = useId()
  /** Le passage visé par le menu « moment » (ms) ; `null` : menu fermé. */
  const [moment, setMoment] = useState<number | null>(null)
  const {
    audioProps,
    progressRef,
    isPlaying,
    currentMs,
    durationMs,
    play,
    pause,
    toggle,
    seek,
    seekTo,
    getPositionMs,
    skip,
  } = useAudioPlayer({
    knownDurationMs: attachment.voice?.durationMs,
    rate: playback.rate,
    onPlay: (element) => playback.handlePlay(attachment.id, element),
    onPause: () => playback.handlePause(attachment.id),
    onEnded: () => playback.handleEnded(attachment.id),
    onProgress: (ratio) => playback.handleProgress(attachment.id, ratio),
  })

  // Le coordinateur peut lancer ce vocal (enchaînement), le mettre en pause,
  // le placer sur un passage cité, ou dire où en est l'écoute (réponse à un passage).
  const { register } = playback
  useEffect(
    () =>
      register(attachment.id, {
        play,
        pause,
        seekTo,
        getPositionMs,
        reveal: () =>
          containerRef.current?.scrollIntoView({
            block: "nearest",
            behavior: prefersReducedMotion() ? "instant" : "smooth",
          }),
      }),
    [register, attachment.id, play, pause, seekTo, getPositionMs]
  )

  // On réagit à un passage d'un vocal arrivé au serveur, jamais à un simple
  // fichier audio (sans durée connue d'avance).
  const hasMoments =
    message.status === "sent" &&
    voiceOf(message) !== null &&
    attachment.voice !== undefined &&
    reactions !== null
  const myReaction = reactions
    ? message.reactions.find((item) => item.user.id === reactions.currentUserId)
    : undefined

  /** Ouvre le menu « moment » sur ce passage (le lecteur s'y place). */
  function openMoment(ms: number) {
    const atMs = Math.round(Math.min(Math.max(ms, 0), durationMs))
    seekTo(atMs)
    setMoment(atMs)
  }

  function ratioAt(clientX: number, element: HTMLElement) {
    const bounds = element.getBoundingClientRect()
    return Math.min(Math.max((clientX - bounds.left) / bounds.width, 0), 1)
  }

  // Maintenir le doigt (ou la souris) sur l'onde : glisser jusqu'au passage, y rester.
  const hold = useHoldStill(({ clientX, pointerId }) => {
    const slider = progressRef.current
    if (!slider) return
    if (slider.hasPointerCapture(pointerId)) slider.releasePointerCapture(pointerId)
    openMoment(ratioAt(clientX, slider) * durationMs)
  })

  const levels = attachment.voice?.waveform.length
    ? attachment.voice.waveform
    : PLACEHOLDER_WAVEFORM
  const hasStarted = isPlaying || currentMs > 0
  const isUnheard = playback.isUnheard(message)
  // Vocal envoyé : la carte prend la couleur de son écoute (en attente, en écoute, écouté).
  const listenState =
    isOwn && message.status === "sent"
      ? getListenState(
          playback.getLiveListeners(message.id),
          message.listenedBy,
          message.listenProgress
        )
      : null
  const tone = listenState ? LISTEN_TONE[listenState.kind] : undefined

  function seekFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    seek(ratioAt(event.clientX, event.currentTarget))
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const actions: Record<string, () => void> = {
      ArrowRight: () => skip(KEYBOARD_STEP_MS),
      ArrowUp: () => skip(KEYBOARD_STEP_MS),
      ArrowLeft: () => skip(-KEYBOARD_STEP_MS),
      ArrowDown: () => skip(-KEYBOARD_STEP_MS),
      Home: () => seek(0),
      End: () => seek(1),
      " ": toggle,
      // Au clavier : réagir au passage où l'on est.
      ...(hasMoments && { Enter: () => openMoment(currentMs) }),
    }
    const action = actions[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

  return (
    <div
      ref={containerRef}
      data-variant={isOwn ? "own" : "other"}
      data-listen={tone}
      className={cn(
        "flex w-64 max-w-full scroll-my-24 items-center gap-2.5 rounded-2xl py-2 pr-3 pl-2",
        isOwn ? "rounded-br-md" : "rounded-bl-md bg-muted",
        // En cours d'envoi ou en échec : la bulle neutre de l'expéditeur.
        isOwn && (tone ? "listen-card" : "bg-primary text-primary-foreground")
      )}
    >
      <audio src={getAttachmentUrl(attachment)} {...audioProps} />

      <PlayButton
        isPlaying={isPlaying}
        isOwn={isOwn}
        isUnheard={isUnheard}
        isToned={tone !== undefined}
        onToggle={toggle}
      />

      <div className="min-w-0 flex-1">
        {hasMoments && reactions && (
          <MomentMarkers
            reactions={message.reactions}
            durationMs={durationMs}
            currentUserId={reactions.currentUserId}
            onPlayFrom={(atMs) => {
              seekTo(atMs)
              play()
            }}
          />
        )}

        {hasMoments && (
          <span id={momentHintId} hidden>
            Entrée ou appui maintenu : réagir à ce passage
          </span>
        )}
        {/* Deux couches identiques : la couche vive est découpée selon `--progress`. */}
        <div
          ref={progressRef}
          role="slider"
          tabIndex={0}
          aria-label="Position de lecture"
          aria-describedby={hasMoments ? momentHintId : undefined}
          aria-keyshortcuts={hasMoments ? "Enter" : undefined}
          aria-valuemin={0}
          aria-valuemax={Math.round(durationMs / 1000)}
          aria-valuenow={Math.round(currentMs / 1000)}
          aria-valuetext={`${formatDuration(currentMs)} sur ${formatDuration(durationMs)}`}
          title={hasMoments ? "Maintenez sur un passage pour y réagir" : undefined}
          onPointerDown={(event) => {
            // L'appui long du message (son menu) ne s'en mêle pas : ici, on vise un passage.
            if (hasMoments) event.stopPropagation()
            event.currentTarget.setPointerCapture(event.pointerId)
            seekFromPointer(event)
            if (hasMoments) hold.onPointerDown(event)
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              seekFromPointer(event)
              if (hasMoments) hold.onPointerMove(event)
            }
          }}
          onPointerUp={hold.onPointerUp}
          onPointerCancel={hold.onPointerCancel}
          onContextMenu={(event) => {
            if (!hasMoments) return
            // Clic droit à la souris ; au doigt, l'appui maintenu s'en charge déjà.
            event.preventDefault()
            event.stopPropagation()
            openMoment(ratioAt(event.clientX, event.currentTarget) * durationMs)
          }}
          onKeyDown={handleKeyDown}
          className="relative cursor-pointer touch-none rounded-sm outline-none [--progress:0] [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-current/40"
        >
          <Waveform levels={levels} className="opacity-35" />
          <Waveform
            levels={levels}
            className="absolute inset-0"
            style={{ clipPath: "inset(0 calc((1 - var(--progress)) * 100%) 0 0)" }}
          />
          {/* Le passage visé, marqué sur l'onde le temps du menu ; le menu s'y accroche. */}
          <span
            ref={momentAnchorRef}
            aria-hidden
            className={cn(
              "pointer-events-none absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-current transition-opacity",
              moment === null ? "opacity-0" : "opacity-100"
            )}
            style={{ left: `${durationMs > 0 ? ((moment ?? 0) / durationMs) * 100 : 0}%` }}
          />
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums">
          {isUnheard && (
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-read" />
          )}
          {/* Avant la lecture : la durée totale ; pendant : la position, à laquelle on peut réagir. */}
          {hasMoments && hasStarted ? (
            <button
              type="button"
              onClick={() => openMoment(currentMs)}
              aria-label={`Réagir au passage ${formatMoment(currentMs)}`}
              className="-mx-1 flex items-center gap-0.5 rounded-full px-1 opacity-80 outline-none transition-[opacity,background-color] hover:bg-current/10 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current/40"
            >
              {formatDuration(currentMs)}
              <HugeiconsIcon icon={SmilePlusIcon} size={11} strokeWidth={2} aria-hidden />
            </button>
          ) : (
            <span className="opacity-80">
              {formatDuration(hasStarted ? currentMs : durationMs)}
            </span>
          )}
          {isUnheard && <span className="sr-only">Pas encore écouté</span>}

          {/* L'accusé d'écoute n'a de sens qu'une fois le vocal parti. */}
          {listenState && <ListenStatus state={listenState} />}

          <PlaybackRateButton
            rate={playback.rate}
            onClick={playback.cycleRate}
            className={cn(
              "ml-auto min-w-9 px-1.5 py-px text-[11px] focus-visible:ring-current/40",
              tone ? "bg-tone/15" : isOwn ? "bg-primary-foreground/15" : "bg-foreground/10"
            )}
          />
        </div>
      </div>

      {hasMoments && reactions && (
        <MomentMenu
          atMs={moment}
          onClose={() => setMoment(null)}
          anchor={momentAnchorRef}
          selected={
            myReaction?.atMs !== undefined && myReaction.atMs === moment ? myReaction.emoji : undefined
          }
          onReact={(emoji) => {
            if (moment !== null) reactions.react(message, emoji, moment)
            setMoment(null)
          }}
        />
      )}
    </div>
  )
}

interface PlayButtonProps {
  isPlaying: boolean
  isOwn: boolean
  /** Vocal reçu pas encore écouté : le bouton prend la couleur d'accent. */
  isUnheard: boolean
  /** Dans une carte teintée par son état d'écoute (`listen-card`) : il en prend la couleur. */
  isToned: boolean
  onToggle: () => void
}

/** Lecture ↔ pause, échangés sur place (Animate UI, `recipes/swap.md`). */
function PlayButton({ isPlaying, isOwn, isUnheard, isToned, onToggle }: PlayButtonProps) {
  const swap = useTempoTransition(transition.swap)

  return (
    <AnimateIcon animateOnHover animateOnTap asChild>
      <button
        type="button"
        onClick={onToggle}
        aria-label={isPlaying ? "Mettre en pause" : "Écouter le message vocal"}
        className={cn(
          "press grid size-10 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          isToned
            ? "bg-tone text-background shadow-sm"
            : isOwn
              ? "bg-primary-foreground text-primary"
              : isUnheard
                ? "bg-read text-white"
                : "bg-primary text-primary-foreground"
        )}
      >
        <ReducedMotionConfig>
          <span className="relative inline-flex">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={isPlaying ? "pause" : "play"}
                className="inline-flex"
                initial={{ opacity: 0, scale: scale.icon, filter: blur.icon }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: swap }}
                exit={{ opacity: 0, scale: scale.icon, filter: blur.icon, transition: swap }}
              >
                {isPlaying ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" className="translate-x-px" />
                )}
              </motion.span>
            </AnimatePresence>
          </span>
        </ReducedMotionConfig>
      </button>
    </AnimateIcon>
  )
}
