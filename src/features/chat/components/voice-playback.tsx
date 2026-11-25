"use client"

import { createContext, use, useEffect, useEffectEvent, useRef, useState } from "react"
import { createAudioMeter, elementSource, type AudioMeter } from "@/components/voice-audio"
import { isPlayableAudio } from "../lib/attachments"
import type { ChatMessage, ChatUser, LiveListener } from "../types"

const PLAYBACK_RATES = [1, 1.5, 2] as const
export type PlaybackRate = (typeof PLAYBACK_RATES)[number]

/** Ce qu'un lecteur expose au coordinateur. */
export interface PlayerControls {
  play: () => void
  pause: () => void
  /** Fait défiler la conversation jusqu'au lecteur. */
  reveal: () => void
}

export interface NowPlaying {
  attachmentId: string
  author: ChatUser
  isPlaying: boolean
}

interface VoicePlaybackContextValue {
  rate: PlaybackRate
  cycleRate: () => void
  nowPlaying: NowPlaying | null
  /** Vocal reçu que l'utilisateur n'a pas encore écouté. */
  isUnheard: (message: ChatMessage) => boolean
  /** Participants qui écoutent ce message à l'instant même. */
  getLiveListeners: (messageId: string) => ChatUser[]
  /** Inscrit un lecteur ; renvoie la fonction de désinscription. */
  register: (attachmentId: string, controls: PlayerControls) => () => void
  handlePlay: (attachmentId: string, element: HTMLAudioElement) => void
  handlePause: (attachmentId: string) => void
  handleEnded: (attachmentId: string) => void
  /** Position atteinte pendant la lecture (de 0 à 1). */
  handleProgress: (attachmentId: string, ratio: number) => void
  /** Met en pause ou relance le vocal en cours (mini-lecteur). */
  toggleNowPlaying: () => void
  /** Arrête le vocal en cours et ferme le mini-lecteur. */
  stop: () => void
  /** Volume du vocal en cours (0 à 1), lu à chaque image par l'orbe vocal. */
  getLevel: () => number
  /** Volume par bande de fréquence du vocal en cours, pour l'orbe vocal. */
  getSpectrum: () => ArrayLike<number>
}

const SILENCE = new Float32Array(8)

const VoicePlaybackContext = createContext<VoicePlaybackContextValue | null>(null)

export function useVoicePlayback() {
  const context = use(VoicePlaybackContext)
  if (!context) throw new Error("useVoicePlayback doit être utilisé dans <VoicePlaybackProvider>")
  return context
}

interface VoicePlaybackProviderProps {
  messages: ChatMessage[]
  currentUserId: string
  /** Participants qui écoutent un vocal en ce moment. */
  liveListeners: LiveListener[]
  /** Appelé quand l'utilisateur commence (`messageId`) ou cesse (`null`) d'écouter un vocal reçu. */
  onListeningChange: (messageId: string | null) => void
  /** Appelé quand l'écoute d'un vocal reçu, pas encore entendu en entier, avance (`percent` de 0 à 100). */
  onListenProgress: (messageId: string, percent: number) => void
  /** Appelé quand un vocal reçu a été écouté jusqu'au bout pour la première fois. */
  onListened: (message: ChatMessage) => void
  children: React.ReactNode
}

/**
 * Coordonne l'écoute dans la conversation : un seul vocal à la fois, une
 * vitesse commune, les accusés « en écoute » puis « écouté », et l'enchaînement
 * automatique sur le vocal suivant tant qu'il n'a pas été écouté (comme une
 * messagerie vocale).
 */
export function VoicePlaybackProvider({
  messages,
  currentUserId,
  liveListeners,
  onListeningChange,
  onListenProgress,
  onListened,
  children,
}: VoicePlaybackProviderProps) {
  const playersRef = useRef(new Map<string, PlayerControls>())
  const audioContextRef = useRef<AudioContext | null>(null)
  const meterRef = useRef<AudioMeter | null>(null)
  const [rate, setRate] = useState<PlaybackRate>(1)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  // Fonctions stables : lues à chaque image, elles ne relancent aucune boucle d'animation.
  const [readers] = useState(() => ({
    getLevel: () => meterRef.current?.getLevel() ?? 0,
    getSpectrum: (): ArrayLike<number> => meterRef.current?.getSpectrum() ?? SILENCE,
  }))

  // Un seul contexte audio pour toute la conversation, créé et réveillé dans un
  // geste de l'utilisateur (le navigateur l'exige) : la lecture qui suit le
  // traverse sans jamais tomber sur un contexte endormi, donc muet.
  useEffect(() => {
    function wake() {
      audioContextRef.current ??= new AudioContext()
      void audioContextRef.current.resume()
    }
    window.addEventListener("pointerdown", wake, true)
    window.addEventListener("keydown", wake, true)
    return () => {
      window.removeEventListener("pointerdown", wake, true)
      window.removeEventListener("keydown", wake, true)
      meterRef.current?.disconnect()
      void audioContextRef.current?.close()
    }
  }, [])

  /** Branche la mesure du son sur le vocal en cours (sans effet si impossible). */
  function meter(element: HTMLAudioElement) {
    const context = audioContextRef.current
    if (!context) return

    meterRef.current?.disconnect()
    try {
      meterRef.current = createAudioMeter(context, elementSource(element, context).node)
    } catch {
      // Mesure indisponible : la lecture continue, l'orbe reste au repos.
      meterRef.current = null
    }
  }

  // Les vocaux de la conversation, dans l'ordre d'affichage.
  const queue = messages.flatMap((message) =>
    message.attachments
      .filter((attachment) => isPlayableAudio(attachment.mimeType))
      .map((attachment) => ({ attachmentId: attachment.id, message }))
  )

  function findItem(attachmentId: string) {
    return queue.find((item) => item.attachmentId === attachmentId)
  }

  function isUnheard(message: ChatMessage) {
    return (
      message.author.id !== currentUserId &&
      !message.listenedBy.some((user) => user.id === currentUserId)
    )
  }

  function getLiveListeners(messageId: string) {
    return liveListeners
      .filter((listener) => listener.messageId === messageId)
      .map((listener) => listener.user)
  }

  // Les autres voient « en écoute » tant qu'un de leurs vocaux joue ici (pas en pause).
  const playingMessage = nowPlaying?.isPlaying
    ? findItem(nowPlaying.attachmentId)?.message
    : undefined
  const listeningId =
    playingMessage && playingMessage.author.id !== currentUserId ? playingMessage.id : null

  const announceListening = useEffectEvent(onListeningChange)
  useEffect(() => {
    announceListening(listeningId)
  }, [listeningId])

  function register(attachmentId: string, controls: PlayerControls) {
    playersRef.current.set(attachmentId, controls)
    return () => {
      playersRef.current.delete(attachmentId)
    }
  }

  function handlePlay(attachmentId: string, element: HTMLAudioElement) {
    // Un seul vocal à la fois.
    if (nowPlaying && nowPlaying.attachmentId !== attachmentId) {
      playersRef.current.get(nowPlaying.attachmentId)?.pause()
    }
    meter(element)

    const item = findItem(attachmentId)
    if (!item) return
    setNowPlaying({ attachmentId, author: item.message.author, isPlaying: true })
  }

  function handlePause(attachmentId: string) {
    setNowPlaying((current) =>
      current?.attachmentId === attachmentId ? { ...current, isPlaying: false } : current
    )
  }

  function handleEnded(attachmentId: string) {
    const index = queue.findIndex((item) => item.attachmentId === attachmentId)
    const current = queue[index]
    const next = queue[index + 1]

    // « Écouté » seulement une fois le vocal entendu jusqu'au bout.
    if (current && isUnheard(current.message)) {
      onListenProgress(current.message.id, 100)
      onListened(current.message)
    }

    // Le vocal suivant, s'il n'a pas encore été écouté, enchaîne de lui-même.
    if (index !== -1 && next && isUnheard(next.message)) {
      const player = playersRef.current.get(next.attachmentId)
      player?.reveal()
      player?.play()
      return
    }
    setNowPlaying(null)
  }

  function handleProgress(attachmentId: string, ratio: number) {
    const item = findItem(attachmentId)
    if (item && isUnheard(item.message)) {
      onListenProgress(item.message.id, Math.floor(ratio * 100))
    }
  }

  function toggleNowPlaying() {
    if (!nowPlaying) return
    const player = playersRef.current.get(nowPlaying.attachmentId)
    if (nowPlaying.isPlaying) player?.pause()
    else player?.play()
  }

  function stop() {
    if (nowPlaying) playersRef.current.get(nowPlaying.attachmentId)?.pause()
    setNowPlaying(null)
  }

  function cycleRate() {
    setRate(
      (current) => PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(current) + 1) % PLAYBACK_RATES.length]
    )
  }

  return (
    <VoicePlaybackContext
      value={{
        rate,
        cycleRate,
        nowPlaying,
        isUnheard,
        getLiveListeners,
        register,
        handlePlay,
        handlePause,
        handleEnded,
        handleProgress,
        toggleNowPlaying,
        stop,
        getLevel: readers.getLevel,
        getSpectrum: readers.getSpectrum,
      }}
    >
      {children}
    </VoicePlaybackContext>
  )
}
