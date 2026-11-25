"use client"

import { useEffect, useRef } from "react"
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
import { getAttachmentUrl } from "../lib/attachments"
import { WAVEFORM_BARS } from "../lib/config"
import { formatDuration } from "../lib/format"
import type { Attachment, ChatMessage } from "../types"
import { getListenState, LISTEN_TONE, ListenStatus } from "./listen-status"
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
  const containerRef = useRef<HTMLDivElement>(null)
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
    skip,
  } = useAudioPlayer({
    knownDurationMs: attachment.voice?.durationMs,
    rate: playback.rate,
    onPlay: (element) => playback.handlePlay(attachment.id, element),
    onPause: () => playback.handlePause(attachment.id),
    onEnded: () => playback.handleEnded(attachment.id),
    onProgress: (ratio) => playback.handleProgress(attachment.id, ratio),
  })

  // Le coordinateur peut lancer ce vocal (enchaînement) ou le mettre en pause.
  const { register } = playback
  useEffect(
    () =>
      register(attachment.id, {
        play,
        pause,
        reveal: () =>
          containerRef.current?.scrollIntoView({
            block: "nearest",
            behavior: prefersReducedMotion() ? "instant" : "smooth",
          }),
      }),
    [register, attachment.id, play, pause]
  )

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
    const bounds = event.currentTarget.getBoundingClientRect()
    seek((event.clientX - bounds.left) / bounds.width)
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
        {/* Deux couches identiques : la couche vive est découpée selon `--progress`. */}
        <div
          ref={progressRef}
          role="slider"
          tabIndex={0}
          aria-label="Position de lecture"
          aria-valuemin={0}
          aria-valuemax={Math.round(durationMs / 1000)}
          aria-valuenow={Math.round(currentMs / 1000)}
          aria-valuetext={`${formatDuration(currentMs)} sur ${formatDuration(durationMs)}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            seekFromPointer(event)
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromPointer(event)
          }}
          onKeyDown={handleKeyDown}
          className="relative cursor-pointer touch-none rounded-sm outline-none [--progress:0] focus-visible:ring-2 focus-visible:ring-current/40"
        >
          <Waveform levels={levels} className="opacity-35" />
          <Waveform
            levels={levels}
            className="absolute inset-0"
            style={{ clipPath: "inset(0 calc((1 - var(--progress)) * 100%) 0 0)" }}
          />
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums">
          {isUnheard && (
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-read" />
          )}
          {/* Avant la lecture : la durée totale ; pendant : la position. */}
          <span className="opacity-80">
            {formatDuration(hasStarted ? currentMs : durationMs)}
          </span>
          {isUnheard && <span className="sr-only">Pas encore écouté</span>}

          {/* L'accusé d'écoute n'a de sens qu'une fois le vocal parti. */}
          {listenState && <ListenStatus state={listenState} />}

          <button
            type="button"
            onClick={playback.cycleRate}
            aria-label={`Vitesse de lecture : ${playback.rate}×`}
            className={cn(
              "press ml-auto min-w-8 rounded-full px-1.5 py-px text-[11px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-current/40",
              tone ? "bg-tone/15" : isOwn ? "bg-primary-foreground/15" : "bg-foreground/10"
            )}
          >
            {playback.rate}×
          </button>
        </div>
      </div>
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
