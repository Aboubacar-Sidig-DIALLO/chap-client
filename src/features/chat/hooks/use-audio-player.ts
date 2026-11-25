"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Les webm produits par `MediaRecorder` (Chrome) n'annoncent pas leur durée
 * (`Infinity`), ce qui empêche de s'y déplacer. Se placer « au bout » force le
 * navigateur à la calculer ; on revient ensuite au début.
 */
function ensureKnownDuration(audio: HTMLAudioElement, onKnown: () => void) {
  if (Number.isFinite(audio.duration)) return onKnown()

  const handleDurationChange = () => {
    if (!Number.isFinite(audio.duration)) return
    audio.removeEventListener("durationchange", handleDurationChange)
    audio.currentTime = 0
    onKnown()
  }
  audio.addEventListener("durationchange", handleDurationChange)
  audio.currentTime = Number.MAX_SAFE_INTEGER
}

interface UseAudioPlayerOptions {
  /** Durée connue d'avance (vocal), sinon lue dans le fichier. */
  knownDurationMs?: number
  /** Vitesse de lecture (partagée par toute la conversation). */
  rate: number
  /** Reçoit l'élément `<audio>`, pour mesurer le son (orbe vocal). */
  onPlay?: (element: HTMLAudioElement) => void
  onPause?: () => void
  onEnded?: () => void
  /** Position atteinte pendant la lecture (de 0 à 1), quelques fois par seconde. */
  onProgress?: (ratio: number) => void
}

/**
 * Lecture d'un fichier audio. La progression est écrite à chaque image dans la
 * variable CSS `--progress` (de 0 à 1) de `progressRef`, sans re-rendu React.
 */
export function useAudioPlayer({
  knownDurationMs,
  rate,
  onPlay,
  onPause,
  onEnded,
  onProgress,
}: UseAudioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const isPreparingRef = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [fileDurationMs, setFileDurationMs] = useState<number | null>(null)

  const durationMs = knownDurationMs ?? fileDurationMs ?? 0

  function renderProgress(ms: number) {
    const progress = durationMs > 0 ? Math.min(ms / durationMs, 1) : 0
    progressRef.current?.style.setProperty("--progress", String(progress))
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate])

  // Pendant la lecture, la progression suit chaque image (fluide, sans re-rendu).
  useEffect(() => {
    if (!isPlaying) return

    let frame = 0
    const tick = () => {
      const audio = audioRef.current
      if (audio && durationMs > 0) {
        const progress = Math.min((audio.currentTime * 1000) / durationMs, 1)
        progressRef.current?.style.setProperty("--progress", String(progress))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, durationMs])

  function play() {
    void audioRef.current?.play()
  }

  function pause() {
    audioRef.current?.pause()
  }

  function toggle() {
    if (audioRef.current?.paused) play()
    else pause()
  }

  /** Se place à `ratio` (de 0 à 1) de la durée. */
  function seek(ratio: number) {
    const audio = audioRef.current
    if (!audio || durationMs <= 0) return

    const ms = Math.min(Math.max(ratio, 0), 1) * durationMs
    audio.currentTime = ms / 1000
    setCurrentMs(ms)
    renderProgress(ms)
  }

  /** Avance ou recule de `deltaMs`. */
  function skip(deltaMs: number) {
    if (durationMs > 0) seek((currentMs + deltaMs) / durationMs)
  }

  /** Gestionnaires à poser sur l'élément `<audio>`. */
  const audioProps = {
    ref: audioRef,
    preload: "metadata",
    // Requis pour mesurer le son d'un fichier servi par l'API (autre origine) :
    // sans CORS, Web Audio rendrait la lecture muette.
    crossOrigin: "anonymous",
    onLoadedMetadata: () => {
      const audio = audioRef.current
      if (!audio) return
      audio.playbackRate = rate
      isPreparingRef.current = true
      ensureKnownDuration(audio, () => {
        isPreparingRef.current = false
        setFileDurationMs(audio.duration * 1000)
      })
    },
    onPlay: () => {
      setIsPlaying(true)
      if (audioRef.current) onPlay?.(audioRef.current)
    },
    onPause: () => {
      setIsPlaying(false)
      onPause?.()
    },
    onTimeUpdate: () => {
      const audio = audioRef.current
      if (!audio || isPreparingRef.current) return
      setCurrentMs(audio.currentTime * 1000)
      // Seule la lecture compte : se déplacer à l'arrêt ne vaut pas écoute.
      if (!audio.paused && durationMs > 0) {
        onProgress?.(Math.min((audio.currentTime * 1000) / durationMs, 1))
      }
    },
    onEnded: () => {
      const audio = audioRef.current
      if (audio) audio.currentTime = 0
      setCurrentMs(0)
      renderProgress(0)
      onEnded?.()
    },
  } satisfies React.ComponentProps<"audio">

  return {
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
  }
}
