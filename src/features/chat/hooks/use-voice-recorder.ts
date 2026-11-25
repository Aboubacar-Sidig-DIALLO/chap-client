"use client"

import { useEffect, useRef, useState } from "react"
import {
  getMicrophoneErrorMessage,
  startVoiceRecording,
  type VoiceRecording,
  type VoiceRecordingSession,
} from "../lib/voice-recording"

export type RecorderStatus = "idle" | "starting" | "recording"

interface UseVoiceRecorderOptions {
  maxDurationMs: number
  /** Appelé une fois, quand la durée maximale est atteinte. */
  onMaxDuration: () => void
}

/**
 * Enregistrement d'un message vocal, piloté par `start`, `stop` et `cancel`.
 * Le micro n'est ouvert que pendant l'enregistrement, et toujours libéré au
 * démontage.
 */
export function useVoiceRecorder({ maxDurationMs, onMaxDuration }: UseVoiceRecorderOptions) {
  const sessionRef = useRef<VoiceRecordingSession | null>(null)
  /** Incrémenté à chaque annulation : un micro qui s'ouvre trop tard est refermé aussitôt. */
  const generationRef = useRef(0)
  // Toujours la dernière version du rappel : il est appelé depuis le minuteur d'enregistrement.
  const onMaxDurationRef = useRef(onMaxDuration)
  useEffect(() => {
    onMaxDurationRef.current = onMaxDuration
  })

  const [status, setStatus] = useState<RecorderStatus>("idle")
  const [elapsedMs, setElapsedMs] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () => () => {
      generationRef.current++
      sessionRef.current?.cancel()
    },
    []
  )

  function reset() {
    sessionRef.current = null
    setStream(null)
    setStatus("idle")
    setElapsedMs(0)
  }

  /** Ouvre le micro et commence à enregistrer (à appeler depuis un geste de l'utilisateur). */
  async function start() {
    if (status !== "idle") return

    const generation = ++generationRef.current
    let hasReachedMax = false
    setError(null)
    setElapsedMs(0)
    setStatus("starting")

    try {
      const session = await startVoiceRecording({
        onTick: ({ elapsedMs }) => {
          setElapsedMs(elapsedMs)
          if (elapsedMs >= maxDurationMs && !hasReachedMax) {
            hasReachedMax = true
            onMaxDurationRef.current()
          }
        },
      })

      // Annulé pendant la demande d'autorisation : on referme tout de suite.
      if (generation !== generationRef.current) return session.cancel()

      sessionRef.current = session
      setStream(session.stream)
      setStatus("recording")
    } catch (recordingError) {
      if (generation !== generationRef.current) return
      setError(getMicrophoneErrorMessage(recordingError))
      setStatus("idle")
    }
  }

  /** Termine l'enregistrement ; `null` s'il n'avait pas encore commencé. */
  async function stop(): Promise<VoiceRecording | null> {
    const session = sessionRef.current
    if (!session) return null

    reset()
    return session.stop()
  }

  /** Abandonne l'enregistrement (même s'il est encore en train de démarrer). */
  function cancel() {
    generationRef.current++
    sessionRef.current?.cancel()
    reset()
  }

  return {
    status,
    elapsedMs,
    /** Flux du micro pendant l'enregistrement, pour l'orbe. */
    stream,
    error,
    clearError: () => setError(null),
    start,
    stop,
    cancel,
  }
}
