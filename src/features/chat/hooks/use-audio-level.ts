"use client"

import { useEffect, useRef, useState } from "react"
import { createAudioMeter, type AudioMeter } from "@/components/voice-audio"
import { closeAudioContext } from "@/lib/audio-context"

/**
 * Écrit le volume (0 à 1) dans la variable CSS `--level` de l'élément, à chaque
 * image et sans re-rendu React. Sans source, l'élément revient au repos (0).
 */
export function useLevelVariable<T extends HTMLElement>(getLevel?: () => number) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !getLevel) return

    let frame = 0
    const tick = () => {
      element.style.setProperty("--level", getLevel().toFixed(3))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      element.style.setProperty("--level", "0")
    }
  }, [getLevel])

  return ref
}

/**
 * Volume d'un flux (le micro pendant un enregistrement), mesuré par le compteur
 * Hairline UI. Renvoie une fonction stable, lue à chaque image.
 */
export function useStreamLevel(stream: MediaStream | null) {
  const meterRef = useRef<AudioMeter | null>(null)
  const [getLevel] = useState(() => () => meterRef.current?.getLevel() ?? 0)

  useEffect(() => {
    if (!stream) return

    const context = new AudioContext()
    void context.resume()
    meterRef.current = createAudioMeter(context, context.createMediaStreamSource(stream))

    return () => {
      meterRef.current?.disconnect()
      meterRef.current = null
      closeAudioContext(context)
    }
  }, [stream])

  return getLevel
}
