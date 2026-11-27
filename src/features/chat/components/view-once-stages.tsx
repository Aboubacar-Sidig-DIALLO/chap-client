 
"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { AnimateIcon } from "@animate-ui/react/icons"
import { blur, scale, transition, useTempoTransition } from "@animate-ui/react/utils/motion"
import { VolumeHighIcon, VolumeOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download04 } from "@/components/animate-ui/icons/hugeicons/download-04"
import { Pause } from "@/components/animate-ui/icons/hugeicons/pause"
import { Play } from "@/components/animate-ui/icons/hugeicons/play"
import { createAudioMeter, elementSource, type AudioMeter } from "@/components/voice-audio"
import { buttonVariants } from "@/components/ui/button"
import { closeAudioContext } from "@/lib/audio-context"
import { useAudioPlayer } from "../hooks/use-audio-player"
import { getFileExtension } from "../lib/attachments"
import { formatDuration } from "../lib/format"
import type { OpenedFile } from "../lib/view-once"
import type { ChatUser } from "../types"
import { FileTypeIcon } from "./file-type-icon"
import { PlaybackRateButton } from "./playback-rate-button"
import { ViewOnceIcon } from "./view-once-icon"
import { VoiceHalo } from "./voice-halo"
import { useVoicePlayback } from "./voice-playback"

/**
 * Ce qu'affiche la visionneuse de la vue unique, selon la pièce : une photo
 * qui sort du flou, une vidéo et un vocal qui se lisent tout seuls, un
 * fichier à enregistrer. Les commandes sont celles de l'application, à ses
 * couleurs (jamais celles du navigateur, qui proposent « Enregistrer sous… »).
 */

/** Diamètre de l'orbe du vocal et de l'anneau du temps qui reste (px). */
const ORB_SIZE = 148
const RING_SIZE = 212

/** Cadre d'une photo ou d'une vidéo : arrondi, ombré, bordé comme les cartes. */
const MEDIA_FRAME_CLASS = "max-h-full max-w-full rounded-3xl shadow-2xl ring-1 ring-border"

/** Petits boutons ronds des commandes (vidéo) : ceux du thème. */
const CONTROL_CLASS =
  "press grid size-11 place-items-center rounded-full bg-muted text-foreground outline-none hover:bg-muted/80 focus-visible:ring-[3px] focus-visible:ring-ring/50"

interface ViewOnceStageProps {
  file: OpenedFile
  author: ChatUser
  /** Avancée de la lecture (vocal, vidéo), de 0 à 1. */
  onProgress: (ratio: number) => void
  /** Fin d'un vocal ou d'une vidéo : on passe à la suite (ou l'on ferme). */
  onEnded: () => void
}

export function ViewOnceStage({ file, author, onProgress, onEnded }: ViewOnceStageProps) {
  switch (file.kind) {
    case "image":
      return <RevealedImage file={file} author={author} />
    case "video":
      return <OnceVideo file={file} onProgress={onProgress} onEnded={onEnded} />
    case "voice":
      return <OnceVoice file={file} onProgress={onProgress} onEnded={onEnded} />
    case "file":
      return <OnceFile file={file} />
  }
}

/** Le temps du téléchargement : le symbole de la vue unique tourne doucement. */
export function OpeningStage() {
  return (
    <div role="status" className="flex flex-col items-center gap-4 text-muted-foreground">
      <motion.span
        className="inline-flex text-voice"
        animate={{ rotate: 360 }}
        transition={{ duration: 6, ease: "linear", repeat: Infinity }}
      >
        <ViewOnceIcon size={56} />
      </motion.span>
      <p className="text-sm">Ouverture…</p>
    </div>
  )
}

/** La photo se dévoile : elle sort d'un flou profond, puis se pose. */
function RevealedImage({ file, author }: { file: OpenedFile; author: ChatUser }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const reveal = useTempoTransition(transition.disclosure)

  return (
    <motion.img
      src={file.objectUrl}
      alt={`Photo de ${author.name}`}
      draggable={false}
      onLoad={() => setIsLoaded(true)}
      initial={false}
      animate={
        isLoaded
          ? { opacity: 1, scale: 1, filter: "blur(0px)" }
          : { opacity: 0, scale: 1.03, filter: "blur(24px)" }
      }
      transition={{ ...reveal, duration: 0.6 }}
      className={`pointer-events-none object-contain ${MEDIA_FRAME_CLASS}`}
    />
  )
}

/** Lecture ↔ pause, échangés sur place (Animate UI, `recipes/swap.md`). */
function PlayPauseIcon({ isPlaying, size }: { isPlaying: boolean; size: number }) {
  const swap = useTempoTransition(transition.swap)

  return (
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
            <Pause size={size} fill="currentColor" />
          ) : (
            <Play size={size} fill="currentColor" className="translate-x-[8%]" />
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

interface PlayableStageProps {
  file: OpenedFile
  onProgress: (ratio: number) => void
  onEnded: () => void
}

/**
 * La vidéo, sans les commandes du navigateur : toucher l'image met en pause
 * ou relance, le temps restant décompte dessous, le son se coupe d'un geste.
 */
function OnceVideo({ file, onProgress, onEnded }: PlayableStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const swap = useTempoTransition(transition.swap)

  function toggle() {
    const video = videoRef.current
    if (!video) return
    // Lecture refusée (pas de geste récent) : l'icône « lecture » reste affichée.
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }

  function handleTimeUpdate(event: React.SyntheticEvent<HTMLVideoElement>) {
    const { currentTime, duration } = event.currentTarget
    if (!Number.isFinite(duration) || duration <= 0) return
    onProgress(currentTime / duration)
    setRemainingMs((duration - currentTime) * 1000)
  }

  return (
    <div className="flex size-full flex-col items-center gap-4">
      <div className="relative grid min-h-0 w-full flex-1 place-items-center">
        <video
          ref={videoRef}
          src={file.objectUrl}
          autoPlay
          playsInline
          muted={isMuted}
          disablePictureInPicture
          disableRemotePlayback
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={onEnded}
          onClick={toggle}
          aria-label={isPlaying ? "Mettre la vidéo en pause" : "Lire la vidéo"}
          className={`cursor-pointer bg-black ${MEDIA_FRAME_CLASS}`}
        />

        {/* En pause : la commande apparaît au centre, sans voiler l'image. */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.span
              key="paused"
              aria-hidden
              initial={{ opacity: 0, scale: scale.action }}
              animate={{ opacity: 1, scale: 1, transition: swap }}
              exit={{ opacity: 0, scale: 1.1, transition: swap }}
              className="pointer-events-none absolute grid size-18 place-items-center rounded-full bg-voice text-voice-foreground shadow-lg"
            >
              <PlayPauseIcon isPlaying={false} size={30} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex w-full max-w-sm items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={isPlaying ? "Mettre en pause" : "Lire"}
          className={CONTROL_CLASS}
        >
          <PlayPauseIcon isPlaying={isPlaying} size={18} />
        </button>
        <p className="text-sm text-muted-foreground tabular-nums">
          {remainingMs === null ? "—" : `${formatDuration(remainingMs)} avant effacement`}
        </p>
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          aria-pressed={isMuted}
          aria-label={isMuted ? "Rétablir le son" : "Couper le son"}
          className={CONTROL_CLASS}
        >
          <HugeiconsIcon icon={isMuted ? VolumeOffIcon : VolumeHighIcon} size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

/**
 * Mesure le volume d'un `<audio>` pour l'orbe. Créée au premier « play » (le
 * geste de l'utilisateur vient d'avoir lieu), libérée à la fermeture.
 */
function useElementMeter() {
  const contextRef = useRef<AudioContext | null>(null)
  const meterRef = useRef<AudioMeter | null>(null)

  useEffect(
    () => () => {
      meterRef.current?.disconnect()
      meterRef.current = null
      if (contextRef.current) closeAudioContext(contextRef.current)
      contextRef.current = null
    },
    []
  )

  return {
    attach(element: HTMLAudioElement) {
      if (meterRef.current) return
      try {
        contextRef.current ??= new AudioContext()
        void contextRef.current.resume()
        meterRef.current = createAudioMeter(
          contextRef.current,
          elementSource(element, contextRef.current).node
        )
      } catch {
        // Mesure indisponible : le son passe, l'orbe reste au repos.
      }
    },
    getLevel: () => meterRef.current?.getLevel() ?? 0,
  }
}

/**
 * Le vocal : l'orbe « voix » vibre avec la voix, l'anneau autour se vide
 * jusqu'à l'effacement, et le temps restant décompte en grand.
 */
function OnceVoice({ file, onProgress, onEnded }: PlayableStageProps) {
  const playback = useVoicePlayback()
  const meter = useElementMeter()
  const { audioProps, progressRef, isPlaying, currentMs, durationMs, toggle } = useAudioPlayer({
    knownDurationMs: file.voice?.durationMs,
    rate: playback.rate,
    autoPlay: true,
    onPlay: meter.attach,
    onProgress,
    onEnded,
  })
  const remainingMs = Math.max(durationMs - currentMs, 0)

  return (
    <div className="flex flex-col items-center gap-8">
      <audio src={file.objectUrl} {...audioProps} />

      {/* `--progress` (0 à 1) est écrit à chaque image par le lecteur : l'anneau suit sans re-rendu. */}
      <div
        ref={progressRef}
        className="relative grid place-items-center [--progress:0]"
        style={{ width: RING_SIZE, height: RING_SIZE }}
      >
        <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            className="text-voice"
            // Le temps restant : l'arc se vide à mesure qu'on écoute.
            style={{ strokeDashoffset: "calc(var(--progress) * 100)" }}
          />
        </svg>

        <AnimateIcon animateOnHover animateOnTap asChild>
          <button
            type="button"
            onClick={toggle}
            aria-label={isPlaying ? "Mettre en pause" : "Écouter"}
            className="press rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
          >
            <VoiceHalo
              size={ORB_SIZE}
              tone="voice"
              getLevel={isPlaying ? meter.getLevel : undefined}
              isBreathing={!isPlaying}
            >
              <PlayPauseIcon isPlaying={isPlaying} size={40} />
            </VoiceHalo>
          </button>
        </AnimateIcon>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-5xl font-semibold tracking-tight tabular-nums">{formatDuration(remainingMs)}</p>
        <p className="text-sm text-muted-foreground">
          {isPlaying ? "avant effacement" : currentMs > 0 ? "en pause" : "touchez l'orbe pour écouter"}
        </p>
      </div>

      <PlaybackRateButton
        rate={playback.rate}
        onClick={playback.cycleRate}
        className="min-w-14 bg-muted px-3 py-1.5 text-sm"
      />
    </div>
  )
}

/** Un fichier : on l'enregistre maintenant, ou jamais. */
function OnceFile({ file }: { file: OpenedFile }) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border bg-card p-6 text-center text-card-foreground shadow-xl">
      <div className="scale-125">
        <FileTypeIcon mimeType={file.mimeType} />
      </div>
      <div className="max-w-full min-w-0">
        <p className="truncate text-base font-semibold">{file.name}</p>
        <p className="text-sm text-muted-foreground">{getFileExtension(file.name)}</p>
      </div>
      <AnimateIcon animateOnHover animateOnTap asChild>
        <a
          href={file.objectUrl}
          download={file.name}
          className={buttonVariants({ size: "lg", className: "w-full rounded-full" })}
        >
          <Download04 size={18} />
          Enregistrer le fichier
        </a>
      </AnimateIcon>
      <p className="text-xs text-balance text-muted-foreground">
        C&apos;est maintenant ou jamais : il ne pourra plus être ouvert depuis la conversation.
      </p>
    </div>
  )
}
